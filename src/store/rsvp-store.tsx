import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

type Value = {
  phone: string
}

const authStore = create<Value>()(
  persist(
    (set) => ({
      phone: "",
    }),
    {
      name: "pes", // name of the item in the storage (must be unique)
    }
  )
)

export { authStore }
