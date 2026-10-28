import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/shared/components/shadcn/navigation-menu';
import { buttonVariants } from "@/shared/components/shadcn/button"

export function HomeLayout() {
  return (
    <div className="flex w-full items-center justify-end p-4">
      <NavigationMenu>
        <NavigationMenuList className="gap-2">

          <NavigationMenuItem>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}
              render={<a href="register" className={buttonVariants({ variant: "secondary" })}>Register</a>} />
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}
              render={<a href="login" className={buttonVariants({ variant: "secondary" })}>Login</a>} />
          </NavigationMenuItem>

        </NavigationMenuList>
      </NavigationMenu>
    </div >
  );
}