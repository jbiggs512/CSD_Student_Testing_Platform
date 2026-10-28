import { Link } from 'react-router';
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from '@shared/components/navigation-menu';
import { Button } from "@shared/components/button"

export function Navbar() {
    // TO DO: Implement authentication logic to determine if the user is logged in or not
    const isAuthenticated = false; // Replace with actual authentication logic
    const userType = (() : "student" | "lecturer" | "administrator" | null => "student")(); // Replace with actual user type logic

    return (
        <div className="flex w-full items-center justify-end px-2">
            <img src="/altius-transparent.png" alt="Logo" className="h-16 w-auto mr-auto" />
            <NavigationMenu>
                <NavigationMenuList className="gap-2">
                    {isAuthenticated ? (
                        userType === "student" ? (
                            // Rendered if the user is logged in and is a student
                            <>
                                <NavigationMenuItem>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()} render={<Link to="/dashboard">Dashboard</Link>} />
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()} render={<Link to="/leaderboards">Leaderboards</Link>} />
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()} render={<Link to="/statistics">Statistics</Link>} />
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()} render={<Link to="/profile">Profile</Link>} />
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()} render={<Button variant="secondary">Logout</Button>} />
                                </NavigationMenuItem>
                            </>
                        ) : userType === "lecturer" ? (
                            // Rendered if the user is logged in and is a lecturer
                            <>
                                <NavigationMenuItem>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()} render={<Link to="/lecturerDashboard">Dashboard</Link>} />
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()} render={<Link to="/students">Students</Link>} />
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()} render={<Link to="/statistics">Tests</Link>} />
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()} render={<Link to="/profile">Profile</Link>} />
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()} render={<Button variant="secondary">Logout</Button>} />
                                </NavigationMenuItem>
                            </>
                        ) : userType === "administrator" ? (
                            // Rendered if the user is logged in and is an administrator
                            <>
                                <NavigationMenuItem>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()} render={<Link to="/adminDashboard">Dashboard</Link>} />
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()} render={<Link to="/lecturers">Lecturers</Link>} />
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()} render={<Link to="/subjects">Subjects</Link>} />
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()} render={<Link to="/profile">Profile</Link>} />
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()} render={<Button variant="secondary">Logout</Button>} />
                                </NavigationMenuItem>
                            </>
                        ) : null
                    ) : (
                        // Rendered if the user is not logged in
                        <>
                            <NavigationMenuItem>
                                <NavigationMenuLink className={navigationMenuTriggerStyle()} render={<Button variant="secondary">Login</Button>} />
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <NavigationMenuLink className={navigationMenuTriggerStyle()} render={<Button variant="secondary">Register</Button>} />
                            </NavigationMenuItem>
                        </>
                    )}
                </NavigationMenuList>
            </NavigationMenu>
        </div>
    );
}