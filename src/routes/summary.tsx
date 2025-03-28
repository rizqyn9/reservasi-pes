import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PRODUCTS } from "@/lib/data"
import { toIdr } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import { queryClient } from "@/lib/tanstack-query"
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

type IProduct = (typeof PRODUCTS)[number]
type OrderItem = IProduct & { qty: number; totalPrice: number }

export const Route = createFileRoute("/summary")({
  async loader(ctx) {
    await queryClient.ensureQueryData(qry())
  },
  component: RouteComponent,
})

const qry = () =>
  queryOptions({
    queryKey: ["summary"],
    queryFn: async () => {
      const { data: orders } = await supabase.from("reservation").select("*")
      const totalPax = orders?.reduce((acc, x) => acc + x.pax, 0)
      const totalPrice =
        orders?.reduce((acc, x) => acc + (x.priceTotal || 0), 0) || 0
      const totalOrder = orders?.length || 0
      return { orders, totalPax, totalPrice, totalOrder }
    },
  })

function RouteComponent() {
  const {
    data: { orders, totalPax, totalOrder, totalPrice },
  } = useSuspenseQuery(qry())

  return (
    <div className="py-6">
      <div className="px-3">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {[
              ["Pax", totalPax],
              ["Total Order", totalOrder],
              ["Total Price", toIdr(totalPrice)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center gap-2 justify-between"
              >
                <p className="text-sm">{label}</p>
                <p className="font-bold">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Accordion type="single" collapsible className="w-full mt-4">
        {orders?.map((order) => {
          return (
            <AccordionItem
              key={order.id}
              value={order.id.toString()}
              className="px-3"
            >
              <AccordionTrigger>
                <div className="grow flex">
                  <p className="grow">
                    {order.name_alias}&nbsp;
                    <span className="text-xs text-gray-400">
                      ({order.phone}) {order.pax} Pax
                    </span>
                  </p>
                  <p className="font-bold">{toIdr(order.priceTotal || 0)}</p>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex py-2 flex-col gap-3">
                  {(order.items as Array<OrderItem>)?.map((item) => {
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 pr-8"
                      >
                        <p className="w-8 rounded-full bg-gray-700 text-white text-center text-sm">
                          {item.qty}
                        </p>
                        <p className="grow text-sm">{item.name}</p>
                        <p className="text-sm">{toIdr(item.totalPrice)}</p>
                      </div>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
