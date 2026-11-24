import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import {
  ChevronDownIcon,
  KeyRoundIcon,
  LogOutIcon,
  MenuIcon,
} from "lucide-react";
import {
  getCurrentUser,
  getDashboardPathForRole,
  logoutUser,
  type AuthUser,
  type UserRole,
} from "@/shared/api";
import {
  Badge,
  Button,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components";
import { ChangePasswordDialog } from "./change-password-dialog";
import logo from "@shared/assets/altius-transparent.png";

interface NavItem {
  to: string;
  label: string;
}

const teachingItems: NavItem[] = [
  { to: "/lecturerDashboard", label: "Teaching dashboard" },
  { to: "/students", label: "Students" },
  { to: "/tests", label: "Tests" },
  { to: "/questionPool", label: "Question Pool" },
];

const navItems: Record<UserRole, NavItem[]> = {
  student: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/leaderboards", label: "Leaderboards" },
    { to: "/statistics", label: "Statistics" },
  ],
  lecturer: [
    { to: "/lecturerDashboard", label: "Dashboard" },
    { to: "/students", label: "Students" },
    { to: "/tests", label: "Tests" },
    { to: "/questionPool", label: "Question Pool" },
  ],
  admin: [
    { to: "/adminDashboard", label: "Dashboard" },
    { to: "/courses", label: "Courses" },
    { to: "/accounts", label: "Accounts" },
    { to: "/subjects", label: "Subjects" },
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  student: "Student",
  lecturer: "Lecturer",
  admin: "Admin",
};

function getInitials(user: AuthUser): string {
  const first = user.first_name.trim().charAt(0);
  const last = user.last_name.trim().charAt(0);
  return `${first}${last}`.toUpperCase() || user.username.slice(0, 2).toUpperCase();
}

export function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const currentUser = getCurrentUser();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userType = currentUser?.role ?? null;
  const items = userType ? navItems[userType] : [];
  const dashboardPath = userType ? getDashboardPathForRole(userType) : "/";

  useEffect(() => {
    if (!profileOpen) return;
    function handleOutsideClick(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [profileOpen]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setOpen(false);
    setProfileOpen(false);
    try {
      await logoutUser();
    } finally {
      setIsLoggingOut(false);
      navigate("/login", { replace: true });
    }
  };

  const renderProfileDetails = () => {
    if (!currentUser || !userType) return null;
    const fullName = `${currentUser.first_name} ${currentUser.last_name}`.trim();

    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-navy">
              {fullName || currentUser.username}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              @{currentUser.username}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {currentUser.email}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 capitalize">
            {ROLE_LABELS[userType]}
          </Badge>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={() => {
              setProfileOpen(false);
              setOpen(false);
              setChangePasswordOpen(true);
            }}
            className="w-full cursor-pointer justify-center gap-2 text-navy hover:bg-muted"
          >
            <KeyRoundIcon className="size-4" aria-hidden="true" />
            Change Password
          </Button>
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full cursor-pointer justify-center gap-2 text-navy hover:bg-muted"
          >
            <LogOutIcon className="size-4" aria-hidden="true" />
            Logout
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <header
        id="nav-bar"
        className="sticky top-0 z-40 flex w-full items-center justify-between gap-4 border-b border-border/80 bg-white/90 px-4 py-2 backdrop-blur-md sm:px-6"
      >
        <Link to={dashboardPath} className="flex shrink-0 items-center">
          <img src={logo} alt="Logo" className="h-12 w-auto sm:h-14" />
        </Link>

        {userType && currentUser && (
          <>
            <div className="hidden items-center gap-3 md:flex">
              <NavigationMenu>
                <NavigationMenuList className="gap-1">
                  {items.map((item) => {
                    const isActive = location.pathname === item.to;
                    return (
                      <NavigationMenuItem key={item.to + item.label}>
                        <NavigationMenuLink
                          active={isActive}
                          className={`${navigationMenuTriggerStyle()} ${
                            isActive
                              ? "bg-muted font-semibold text-plum hover:bg-muted"
                              : "text-navy/85 hover:text-navy"
                          }`}
                          render={
                            <Link
                              to={item.to}
                              aria-current={isActive ? "page" : undefined}
                            >
                              {item.label}
                            </Link>
                          }
                        />
                      </NavigationMenuItem>
                    );
                  })}
                  {userType === "admin" && (
                    <NavigationMenuItem>
                      <NavigationMenuTrigger
                        className={
                          teachingItems.some(
                            (item) => location.pathname === item.to,
                          )
                            ? "bg-muted font-semibold text-plum hover:bg-muted"
                            : "text-navy/85 hover:text-navy"
                        }
                      >
                        Teaching
                      </NavigationMenuTrigger>
                      <NavigationMenuContent className="min-w-52">
                        <div className="flex flex-col gap-1">
                          {teachingItems.map((item) => {
                            const isActive = location.pathname === item.to;
                            return (
                              <NavigationMenuLink
                                key={item.to}
                                active={isActive}
                                render={
                                  <Link
                                    to={item.to}
                                    aria-current={isActive ? "page" : undefined}
                                  >
                                    {item.label}
                                  </Link>
                                }
                              />
                            );
                          })}
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  )}
                </NavigationMenuList>
              </NavigationMenu>

              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  aria-label="Profile menu"
                  aria-expanded={profileOpen}
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-full border border-border bg-white py-1 pr-3 pl-1.5 shadow-2xs transition-colors hover:bg-muted/60"
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                    {getInitials(currentUser)}
                  </span>
                  <span className="max-w-32 truncate text-sm font-medium text-navy">
                    {currentUser.first_name}
                  </span>
                  <Badge variant="secondary" className="text-[11px] capitalize">
                    {ROLE_LABELS[userType]}
                  </Badge>
                  <ChevronDownIcon
                    className={`size-4 text-muted-foreground transition-transform ${
                      profileOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-white p-4 shadow-lg">
                    {renderProfileDetails()}
                  </div>
                )}
              </div>
            </div>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                id="mobile-menu"
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="md:hidden"
                    aria-label="Open menu"
                  />
                }
              >
                <MenuIcon />
              </SheetTrigger>
              <SheetContent side="right" className="w-76">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4">
                  {items.map((item) => {
                    const isActive = location.pathname === item.to;
                    return (
                      <Link
                        key={item.to + item.label}
                        to={item.to}
                        onClick={() => setOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        className={
                          isActive
                            ? "rounded-md bg-muted px-3 py-2 font-semibold text-plum"
                            : "rounded-md px-3 py-2 text-navy"
                        }
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                  {userType === "admin" && (
                    <section
                      aria-label="Teaching"
                      className="mt-2 flex flex-col gap-1 border-t pt-3"
                    >
                      <h2 className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Teaching
                      </h2>
                      {teachingItems.map((item) => {
                        const isActive = location.pathname === item.to;
                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setOpen(false)}
                            aria-current={isActive ? "page" : undefined}
                            className={
                              isActive
                                ? "rounded-md bg-muted px-3 py-2 font-semibold text-plum"
                                : "rounded-md px-3 py-2 text-navy"
                            }
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </section>
                  )}
                  <div className="mt-4 border-t pt-4">
                    {renderProfileDetails()}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </>
        )}
      </header>

      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />

      <Outlet />
    </>
  );
}
