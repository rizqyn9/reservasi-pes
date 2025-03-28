import {
  createFileRoute,
  Link,
  redirect,
  useRouter,
} from "@tanstack/react-router"
import { create } from "zustand"
import { useEffect, useMemo } from "react"
import { CATEGORIES, PRODUCTS } from "@/lib/data"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button, ButtonLoading } from "@/components/ui/button"
import {
  File,
  MinusCircleIcon,
  PlusCircleIcon,
  SearchIcon,
  ShoppingBagIcon,
} from "lucide-react"
import { toIdr } from "@/lib/format"
import { currentUserQry, supabase } from "@/lib/supabase"
import { queryClient } from "@/lib/tanstack-query"
import { authStore } from "@/store/rsvp-store"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { z } from "zod"

export const Route = createFileRoute("/")({
  validateSearch: z.object({
    mode: z.enum(["cart", "default"]).optional().catch("default"),
  }),
  loaderDeps: ({ search }) => search,
  async loader({ deps }) {
    if (!authStore.getState().phone) throw redirect({ to: "/signin" })
    const a = await queryClient.ensureQueryData(currentUserQry())

    if (a.data?.id) {
      authStore.setState({ phone: a.data.phone })
      useUiStore.setState({
        items: (a.data.items as Array<OrderItem>) || [],
        priceTotal: a.data.priceTotal || 0,
      })

      return {
        data: a.data,
        isCart: deps?.mode === "cart",
      }
    }

    throw redirect({ to: "/signin" })
  },
  component: App,
})

function mergeItems(items: Array<OrderItem>) {
  const finalItems = PRODUCTS.map((x) => {
    const selected = items?.find((i) => i.id === x.id)
    return {
      ...x,
      qty: selected?.qty || 0,
      totalPrice: selected?.totalPrice || 0,
    }
  })

  return finalItems
}

type IProduct = (typeof PRODUCTS)[number]
type OrderItem = IProduct & { qty: number; totalPrice: number }

function App() {
  const loader = Route.useLoaderData()

  useEffect(() => {
    useUiStore.setState({
      items: mergeItems(loader.data.items as Array<OrderItem>) || [],
      priceTotal: loader.data.priceTotal || 0,
    })
  }, [])

  return (
    <div className="grow py-6 flex flex-col">
      <div className="border-y-2 border-dashed my-auto grow divide-y-2 divide-dashed divide-border">
        <SectionInfo />
        {loader.isCart ? (
          <MyCart />
        ) : (
          <>
            <SectionCategory />
            <SectionProducts />
          </>
        )}
      </div>
    </div>
  )
}

type Value = {
  search: string
  categoryId: string
  items: Array<OrderItem>
  qtyUpdate: (product: IProduct, qty?: number) => void
  priceTotal: number
}

const PRODUCT_TO_ITEMS = PRODUCTS.map((x) => ({
  ...x,
  qty: 0,
  totalPrice: 0,
}))

const useUiStore = create<Value>((set, get) => ({
  search: "",
  categoryId: "all" as string,
  items: PRODUCT_TO_ITEMS,
  priceTotal: 0,
  qtyUpdate(product, qty = 1) {
    const items = get().items
    const idx = items.findIndex((i) => i.id === product.id)
    const item = items[idx]
    if (item) {
      item.qty += qty
      item.totalPrice = item.qty * product.price
    } else {
      items.push({ ...product, qty, totalPrice: qty * product.price })
    }

    for (const i of items) {
      if (i.qty <= 0) {
        i.qty = 0
        i.totalPrice = 0
      }
    }

    const finalItems = [...items]
    const totalPrice = finalItems.reduce(
      (acc, item) => acc + item.totalPrice,
      0
    )
    set({ items: finalItems, priceTotal: totalPrice })
  },
}))

function SectionInfo() {
  const router = useRouter()
  const { data, isCart } = Route.useLoaderData()
  const { name } = data
  const priceTotal = useUiStore((s) => s.priceTotal)

  const onSignOut = () => {
    authStore.setState({ phone: "" })
    useUiStore.setState({ items: PRODUCT_TO_ITEMS, priceTotal: 0 })
    router.invalidate()
  }

  return (
    <div className="px-3 py-3">
      <p className="font-semibold text-lg">Hai {name}!!</p>
      <p className="text-sm text-gray-600">Pilih menu dibawah ya kawan</p>
      <div className="mt-2 flex justify-between gap-2">
        <div className="flex items-center gap-2">
          {isCart ? (
            <Button asChild>
              <Link to={Route.fullPath} search={{ mode: "default" }}>
                <ShoppingBagIcon /> Cari Pesanan
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to={Route.fullPath} search={{ mode: "cart" }}>
                <ShoppingBagIcon /> Ini Keranjangmu
              </Link>
            </Button>
          )}
          <Button variant={"destructive"} onClick={onSignOut}>
            Keluar
          </Button>
        </div>
        <div>
          <p className="text-sm">Total Biaya:</p>
          <p className="font-semibold text-lg">{toIdr(priceTotal || 0)}</p>
        </div>
      </div>
    </div>
  )
}

function SectionCategory() {
  const categoryId = useUiStore((s) => s.categoryId)

  return (
    <div className="w-full px-3 relative">
      <div
        className="overflow-scroll flex gap-2 py-6"
        style={{ maxWidth: "90vw" }}
      >
        {CATEGORIES.map((category) => {
          const isSelected = categoryId === category.id
          return (
            <button
              key={category.id}
              className={cn(
                "text-nowrap text-sm border px-2 py-1 rounded-full flex items-center transition-colors duration-300",
                isSelected ? "bg-black text-white" : "text-black"
              )}
              onClick={() => {
                useUiStore.setState({ categoryId: category.id })
              }}
            >
              <div
                className={cn(
                  "size-1 rounded-full mr-2",
                  isSelected ? "bg-white" : "bg-gray-500"
                )}
              />
              <h2 className="text-nowrap">{category.name}</h2>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SectionProducts() {
  const search = useUiStore((s) => s.search)
  const categoryId = useUiStore((s) => s.categoryId)
  const qtyUpdate = useUiStore((s) => s.qtyUpdate)
  const orderItems = useUiStore((s) => s.items)

  const products = useMemo(() => {
    let _products = orderItems
    if (categoryId !== "all") {
      _products = _products.filter((p) => p.categoryId === categoryId)
    }

    if (search) {
      _products = _products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      )
    }
    return _products
  }, [search, categoryId, orderItems])

  const category = useMemo(() => {
    return CATEGORIES.find((c) => c.id === categoryId)!
  }, [categoryId])

  return (
    <div className="divide-y-2 divide-dashed divide-border flex flex-col grow">
      <SearchProduct />
      <div className="mt-4 px-3 flex flex-col grow">
        <h1 className="font-bold text-2xl mb-3">
          Daftar Produk ({category.name})
        </h1>
        <datalist id="products">
          {PRODUCTS.map((product) => {
            return <option value={product.name} key={product.id} />
          })}
        </datalist>

        <div className="grow">
          {products.map((product) => {
            return (
              <div
                key={product.id}
                className="flex items-center gap-3 py-4 divide-x divide-yellow-400"
              >
                <div className="grow">
                  <h2 className="font-bold">{product.name}</h2>
                  <p className="text-gray-700">{toIdr(product.price)}</p>
                </div>
                <div
                  className="flex shrink justify-between items-center"
                  style={{ width: "115px" }}
                >
                  <Button
                    variant="outline"
                    size={"icon"}
                    onClick={() => qtyUpdate(product, -1)}
                  >
                    <MinusCircleIcon />
                  </Button>
                  <p className="text-center grow text-sm">
                    {product?.qty || 0}
                  </p>
                  <Button
                    variant={"outline"}
                    size={"icon"}
                    onClick={() => qtyUpdate(product, 1)}
                  >
                    <PlusCircleIcon />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <Submission />
    </div>
  )
}

function Submission() {
  const router = useRouter()
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      const { items, priceTotal } = useUiStore.getState()
      await supabase
        .from("reservation")
        .update({ items: items.filter((x) => x.qty > 0), priceTotal })
        .eq("phone", authStore.getState().phone)

      router.invalidate()
    },
  })

  const onSubmit = () => {
    toast.promise(mutateAsync(), {
      loading: "Menyimpan data",
      success: "Data berhasil disimpan",
      error: "Data gagal disimpan",
    })
  }

  return (
    <div className="sticky bottom-0 px-3 py-4 bg-white flex items-center gap-2">
      <p className="text-destructive text-sm grow italic">
        *Pastikan data yang diisi sudah benar
      </p>
      <ButtonLoading
        className="shrink w-32"
        size={"lg"}
        onClick={onSubmit}
        isLoading={isPending}
      >
        <File />
        Simpan
      </ButtonLoading>
    </div>
  )
}

function SearchProduct() {
  return (
    <div className="px-3 py-4 sticky top-0 bg-white flex items-center gap-2">
      <Input
        placeholder="Cari produk"
        list="products"
        onChange={(e) => {
          useUiStore.setState({ search: e.target.value })
        }}
      />
      <Button size={"icon"}>
        <SearchIcon />
      </Button>
    </div>
  )
}

function MyCart() {
  const items = useUiStore((s) => s.items)
  const priceTotal = useUiStore((s) => s.priceTotal)
  const _items = items.filter((x) => x.qty > 0)

  return (
    <div className="py-3">
      <h1 className="px-3 font-semibold">Daftar Pembelian</h1>

      <div className="px-3 flex flex-col gap-2 mt-4">
        {!_items.length && (
          <div className="h-40 border border-dashed border-border flex items-center justify-center">
            <p>Belum ada produk yang dipilih</p>
          </div>
        )}
        {_items.map((item) => {
          return (
            <div key={item.id} className="flex items-center gap-2">
              <p className="w-8 rounded-full bg-gray-700 text-white text-center">
                {item.qty}
              </p>
              <p className="grow">{item.name}</p>
              <p>{toIdr(item.totalPrice)}</p>
            </div>
          )
        })}
      </div>

      <div className="border-t-2 border-dashed px-3 border-border justify-between flex mt-8 pt-4 text-lg font-semibold">
        <p className="">Total Biaya: </p>
        <p>{toIdr(priceTotal)}</p>
      </div>
    </div>
  )
}
