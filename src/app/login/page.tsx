import { GalleryVerticalEnd } from "lucide-react"

import { LoginForm } from "@/components/login/login-form"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function LoginPage() {
  return (
    <>
    <Navbar/>
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <LoginForm />
      </div>
    </div>
    <Footer/>
    </>
  )
}
