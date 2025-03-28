import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { Button, ButtonLoading } from "@/components/ui/button"
import { authStore } from "@/store/rsvp-store"
import { currentUserQry, supabase } from "@/lib/supabase"
import { useEffect } from "react"
import { toast } from "sonner"
import { useMutation, useQuery } from "@tanstack/react-query"

export const Route = createFileRoute("/signin")({
  async loader() {
    if (authStore.getState().phone) throw redirect({ to: "/" })
  },
  component: RouteComponent,
})

type Schema = z.infer<typeof schema>
const schema = z.object({
  phone: z.string().min(10, "Masukkan nomor WA mu ya kawan"),
  name: z.string().min(2, "Nama yang bakal dateng ya kawan"),
})

function RouteComponent() {
  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "", name: "" },
  })
  const navigate = Route.useNavigate()

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: Schema) => {
      const { phone, name } = data
      await supabase
        .schema("public")
        .from("reservation")
        .upsert({ phone, name })

      return data
    },
    onSuccess: ({ phone }) => {
      authStore.setState({ phone })
      navigate({ to: "/" })
    },
  })

  const a = useQuery(currentUserQry())

  useEffect(() => {
    console.log(a.data)
  }, [a])

  const onSubmit = form.handleSubmit((data) => {
    toast.promise(mutateAsync(data), {
      loading: "Menyimpan data",
      success: "Data berhasil disimpan",
      error: "Data gagal disimpan",
    })
  })

  return (
    <div className="grow py-6 flex flex-col">
      <div className="border-y-2 border-dashed my-auto grow ">
        <div className="text-center mt-8">
          <h2 className="font-semibold">Assalamualaikum</h2>
          <h2 className="font-semibold text-2xl">Warga PES!!!</h2>
          <h2 className="font-semibold text-4xl">😎😎😎😎</h2>
        </div>

        <div className="p-4 flex flex-col gap-6 mt-8">
          <Form {...form}>
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor WA mu sayang</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Diwiwiti 62 geh sayangkuu" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Namamu siapa ganteng??</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Contoh kawat jorok" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ButtonLoading
              className="mx-auto w-48"
              onClick={onSubmit}
              isLoading={isPending}
            >
              Mari Masuk Kawan 😎
            </ButtonLoading>
          </Form>
        </div>
      </div>
    </div>
  )
}
