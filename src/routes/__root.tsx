import { Toaster } from "@/components/ui/sonner"
import { Outlet, createRootRoute } from "@tanstack/react-router"
import React from "react"
// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"

export const Route = createRootRoute({
  component: () => (
    <>
      <React.Suspense fallback={<div>Loading...</div>}>
        <Toaster position="top-center" />
        <div className="min-h-screen flex">
          <div className="grow max-w-lg mx-auto border-x-2 border-dashed flex flex-col">
            <Outlet />
          </div>
        </div>
        {/* <TanStackRouterDevtools /> */}
      </React.Suspense>
    </>
  ),
})
