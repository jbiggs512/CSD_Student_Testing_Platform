import { useState } from "react";
import { Link, Outlet } from "react-router";
import { MenuIcon } from "lucide-react";
import { clearAccessToken, getCurrentUser, type UserRole } from "@/shared/api";
import {
  Button,
  buttonVariants,
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components";
import logo from '@shared/assets/altius-transparent.png'

interface NavItem {
  to: string;
  label: string;
}

// One list per role. Desktop and mobile menus both render from this, so a link only ever has to be added in one place
const navItems: Record<UserRole, NavItem[]> = {
  student: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/leaderboards", label: "Leaderboards" },
    { to: "/statistics", label: "Statistics" },
    { to: "/profile", label: "Profile" },
  ],
  lecturer: [
    { to: "/lecturerDashboard", label: "Dashboard" },
    { to: "/students", label: "Students" },
    { to: "/tests", label: "Tests" },
    { to: "/profile", label: "Profile" },
  ],
  admin: [
    { to: "/adminDashboard", label: "Dashboard" },
    { to: "/lecturers", label: "Lecturers" },
    { to: "/subjects", label: "Subjects" },
    { to: "/profile", label: "Profile" },
  ],
};

export function NavBar() {
  // State to control whether the mobile menu is open/closed
  const [open, setOpen] = useState(false);

  const userType = getCurrentUser()?.role ?? null;

  // Get the navigation items for the current user type, or an empty array if no user is logged in
  const items = userType ? navItems[userType] : [];

  return (
    <>
      <div id="nav-bar" className="flex w-full items-center justify-end px-2">
        <img src={logo} alt="Logo" className="h-16 w-auto mr-auto" />

        {userType && (
          <>
            {/* Desktop: full navigation bar from the md breakpoint up */}
            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList className="gap-2">
                {items.map((item) => (
                  <NavigationMenuItem key={item.to + item.label}>
                    <NavigationMenuLink className={navigationMenuTriggerStyle()} render={<Link to={item.to}>{item.label}</Link>} />
                  </NavigationMenuItem>
                ))}
                <NavigationMenuItem>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}
                    render={<Link to="/login" onClick={clearAccessToken} className={buttonVariants({ variant: "default" })}>Logout</Link>}
                  />
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {/* Mobile: hamburger menu that opens a side panel, hidden from md up */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger id="mobile-menu" render={<Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu" />}>
                <MenuIcon />
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4">
                  {items.map((item) => (
                    <Link key={item.to + item.label} to={item.to} onClick={() => setOpen(false)}>
                      {item.label}
                    </Link>
                  ))}
                  <Link to="/login"
                    onClick={() => {
                      clearAccessToken();
                      setOpen(false);
                    }}
                    className={`${buttonVariants({ variant: "default" })} mt-4`}>
                    Logout
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>

      {/* The Outlet acts as a placeholder for the child route, e.g., DashboardPage */}
      <Outlet />
    </>
  );
}
