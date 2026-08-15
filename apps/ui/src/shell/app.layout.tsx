import { IconFlask2, IconWorld } from "@tabler/icons-react"
import { Link, Outlet, useLocation } from "react-router"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { UserMenu } from "@/features/auth/user-menu"
import { ROUTES } from "@/routes"

const NAV_ITEMS = [{ label: "Sites", to: ROUTES.sites, icon: IconWorld }]

/** The authenticated app's chrome — sidebar, nav, user menu — around whatever route
 * RequireAuth let through. Layout only: it doesn't know or care whether the visitor is
 * allowed to be here. */
export function AppLayout() {
  const { pathname } = useLocation()

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link to={ROUTES.sites} className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium">
            <IconFlask2 className="size-4" />
            AB Tester
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton render={<Link to={to} />} isActive={pathname === to}>
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <UserMenu />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center gap-2 border-b p-3">
          <SidebarTrigger />
        </header>
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
