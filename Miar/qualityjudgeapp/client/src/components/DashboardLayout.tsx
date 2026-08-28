import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { AuthForm } from "@/components/AuthForm";
import { useIsMobile } from "@/hooks/useMobile";
import { Activity, Award, ClipboardCheck, ClipboardList, LayoutDashboard, LogOut, PanelLeft, Globe, Settings2, ShieldCheck, UsersRound } from "lucide-react";
import React, { CSSProperties, useEffect, useRef, useState, createContext, useContext } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { translations, type Lang } from "@shared/i18n";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: typeof translations["ar"] }>({
  lang: "ar",
  setLang: () => {},
  t: translations.ar,
});

export function useLang() {
  return useContext(LangContext);
}

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const LANG_KEY = "miyar-lang";
const DEFAULT_WIDTH = 250;
const MIN_WIDTH = 200;
const MAX_WIDTH = 360;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const [lang, setLangState] = useState<Lang>(() => {
    const queryLang = new URLSearchParams(window.location.search).get("lang");
    if (queryLang === "ar" || queryLang === "en") return queryLang;
    return (localStorage.getItem(LANG_KEY) as Lang) || "ar";
  });
  const { loading, user } = useAuth();

  const setLang = (next: Lang) => {
    setLangState(next);
    localStorage.setItem(LANG_KEY, next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
  };

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const t = translations[lang];

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center bg-[#f4f7f8] p-6">
        <div className="w-full max-w-md rounded-3xl border border-[#dfe8e9] bg-white p-10 text-center shadow-[0_24px_60px_rgba(11,33,64,.10)]">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#c9a227] text-2xl font-bold text-[#0b2140]">م</div>
          <h1 className="mb-3 text-2xl font-bold text-[#0b2140]">{lang === "ar" ? "مرحباً بك في مِعيار" : "Welcome to Mi'yar"}</h1>
          <p className="mb-8 text-sm leading-7 text-[#62717c]">{t.welcomeDesc}</p>
          <AuthForm lang={lang} />
          <p className="mt-5 text-[11px] leading-5 text-[#8b989f]">{t.oauthAccountHint}</p>
        </div>
      </div>
    );
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      <div dir={lang === "ar" ? "rtl" : "ltr"}>
        <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
          <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
        </SidebarProvider>
      </div>
    </LangContext.Provider>
  );
}

function DashboardLayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (width: number) => void }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { lang, setLang, t } = useLang();
  const guidePath = lang === "ar" ? "/miyar_user_guide.pdf" : "/miyar_user_guide_en.pdf";
  const menuItems = [
    { icon: LayoutDashboard, label: t.controlCenter, path: "/admin", active: location === "/admin" },
    { icon: ClipboardCheck, label: t.leaderboard, path: "/", active: location === "/" },
    { icon: Award, label: lang === "ar" ? "سجل الجوائز المؤسسية" : "Institutional Awards", path: "/awards", active: location === "/awards" || location === "/awards-catalog" },
    { icon: ClipboardCheck, label: lang === "ar" ? "فحص الأهلية" : "Eligibility Check", path: "/eligibility-check", active: location === "/eligibility-check" },
    { icon: ShieldCheck, label: lang === "ar" ? "الحوكمة والامتثال" : "Governance & Compliance", path: "/governance", active: location === "/governance" },
    ...(user?.role === "admin" ? [{ icon: ClipboardList, label: lang === "ar" ? "حوكمة المعايير" : "Criteria Governance", path: "/criteria", active: location === "/criteria" }] : []),
    ...(user?.role === "admin" ? [{ icon: Award, label: lang === "ar" ? "النماذج التوضيحية" : "Illustrative Demos", path: "/awards-samples", active: location === "/awards-samples" }] : []),
    { icon: ClipboardCheck, label: t.userGuidePdf, path: guidePath, active: false, external: true },
    { icon: Activity, label: t.assignedTasks, path: "/", active: false },
    ...(user?.role === "admin" ? [{ icon: UsersRound, label: t.users, path: "/users", active: location === "/users" }] : []),
    { icon: Settings2, label: t.systemHealth, path: "/admin", active: false },
  ];
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const next = lang === "ar" ? window.innerWidth - event.clientX : event.clientX - left;
      if (next >= MIN_WIDTH && next <= MAX_WIDTH) setSidebarWidth(next);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, lang, setSidebarWidth]);

  return (
    <>
      <div ref={sidebarRef} className="relative">
        <Sidebar side={lang === "ar" ? "right" : "left"} collapsible="icon" className={`border-${lang === "ar" ? "l" : "r"} border-[#dfe8e9] bg-[#0b2140] text-white`} disableTransition={isResizing}>
          <SidebarHeader className="h-20 justify-center border-b border-white/10">
            <div className="flex w-full items-center gap-3 px-2">
              <button onClick={toggleSidebar} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/15" aria-label="Toggle Sidebar">
                <PanelLeft className="h-4 w-4" />
              </button>
              {!isCollapsed && <div className="min-w-0"><div className="font-bold tracking-tight">{t.appName}</div><div className="mt-1 text-[10px] text-[#b9d5d1]">{t.appSubtitle}</div></div>}
            </div>
          </SidebarHeader>
          <SidebarContent className="gap-0 pt-5">
            <SidebarMenu className="px-3">
              {menuItems.map((item, index) => (
                <SidebarMenuItem key={`${item.path}-${index}`}>
                  <SidebarMenuButton isActive={item.active} onClick={() => item.external ? window.open(item.path, "_blank") : setLocation(item.path)} tooltip={item.label} className="h-11 rounded-xl font-medium text-white/70 hover:bg-white/10 hover:text-white data-[active=true]:bg-[#12897f] data-[active=true]:text-white">
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t border-white/10 p-3 space-y-2">
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="flex w-full items-center gap-3 rounded-xl p-2 text-right transition hover:bg-white/10 group-data-[collapsible=icon]:justify-center">
              <Globe className="h-4 w-4 text-[#c9a227]" />
              <span className="text-xs font-semibold text-white group-data-[collapsible=icon]:hidden">{lang === "ar" ? "English" : "العربية"}</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-xl p-2 text-right transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#c9a227] group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-9 w-9 border border-white/20"><AvatarFallback className="bg-[#c9a227] text-xs font-bold text-[#0b2140]">{user?.name?.charAt(0) || "م"}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-semibold text-white">{user?.name || "المستخدم"}</p><p className="mt-1 truncate text-[10px] text-white/50">{user?.email || "حساب مِعيار"}</p></div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52"><DropdownMenuItem onClick={() => setLocation("/account")} className="cursor-pointer"><UsersRound className={`${lang === "ar" ? "ml-2" : "mr-2"} h-4 w-4`} /><span>{t.accountNav}</span></DropdownMenuItem><DropdownMenuItem onClick={() => void logout()} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className={`${lang === "ar" ? "ml-2" : "mr-2"} h-4 w-4`} /><span>{t.signOut}</span></DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div className={`absolute top-0 ${lang === "ar" ? "left-0" : "right-0"} h-full w-1 cursor-col-resize hover:bg-[#12897f]/20 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => !isCollapsed && setIsResizing(true)} style={{ zIndex: 50 }} />
      </div>
      <SidebarInset className="bg-[#f4f7f8]">
        {!isMobile && <div className="sticky top-0 z-45 flex h-16 items-center justify-between border-b border-[#dfe8e9] bg-white/80 px-6 backdrop-blur"><div className="flex items-center gap-3"><span className="text-sm font-bold text-[#0b2140]">{location === "/admin" ? t.controlCenter : location === "/awards" ? t.awardsLibraryNav : location === "/users" ? t.userManagementTitle : location === "/account" ? t.accountTitle : t.leaderboard}</span></div><a href={guidePath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfe8e9] bg-white px-3.5 py-2 text-xs font-bold text-[#0b2140] shadow-sm transition hover:border-[#12897f] hover:text-[#12897f]">{t.userGuidePdf}</a></div>}
        {isMobile && <div className="sticky top-0 z-45 flex h-14 items-center justify-between border-b border-[#dfe8e9] bg-white/90 px-3 backdrop-blur"><div className="flex items-center gap-2"><SidebarTrigger className="h-9 w-9 rounded-lg" /><span className="text-sm font-semibold text-[#0b2140]">{location === "/admin" ? t.controlCenter : location === "/awards" ? t.awardsLibraryNav : location === "/users" ? t.userManagementTitle : location === "/account" ? t.accountTitle : t.leaderboard}</span></div><a href={guidePath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#0b2140] px-3 py-1.5 text-xs font-bold text-white shadow-sm">{t.userGuidePdf}</a></div>}
        <main className="min-h-screen flex-1">{children}</main>
      </SidebarInset>
    </>
  );
}
