import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { ArrowLeft, Phone } from "lucide-react"
import { useAccount } from "@/features/account/provider/account-provider"
import { useNavigate } from "react-router"

export default function OTPLogin() {

  const { setUserId } = useAccount();
  const navigate = useNavigate();

  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) return

    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsLoading(false)
    setStep("otp")
  }

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return

    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsLoading(false)
    setUserId("123")
    navigate("/")
  }

  const handleBack = () => {
    setStep("phone")
    setOtp("")
  }

  return (
    <div className="min-h-screen bg-blue-100 flex flex-col">
      {/* Mobile-first full screen approach */}
      <div className="flex-1 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white">
              <Phone className="h-8 w-8 text-blue-800" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{step === "phone" ? "Sign In" : "Verify Code"}</h1>
            <p className="text-base text-gray-700 leading-relaxed">
              {step === "phone"
                ? "Enter your phone number to receive a verification code"
                : `We sent a 6-digit code to ${phoneNumber}`}
            </p>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {step === "phone" ? (
              <>
                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-base font-medium text-gray-700">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+972 50 123 4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-14 bg-white text-lg text-center border-2 focus:border-blue-800 focus:ring-blue-800"
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>

                <Button
                  onClick={handleSendOTP}
                  disabled={!phoneNumber.trim() || isLoading}
                  className="w-full h-14 text-lg font-semibold bg-blue-800 hover:bg-blue-900 focus:ring-blue-300"
                >
                  {isLoading ? "Sending..." : "Send Code"}
                </Button>
              </>
            ) : (
              <>
                {/* Back button for mobile */}
                <div className="flex justify-start mb-4">
                  <Button variant="ghost" onClick={handleBack} className="p-2 h-auto text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="h-5 w-5 mr-1" />
                    Back
                  </Button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-base font-medium text-gray-700 text-center block">
                      Enter verification code
                    </Label>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)} className="gap-3">
                        <InputOTPGroup className="gap-3">
                          <InputOTPSlot index={0} className="w-12 h-14 text-xl border-2 rounded-lg bg-white" />
                          <InputOTPSlot index={1} className="w-12 h-14 text-xl border-2 rounded-lg bg-white" />
                          <InputOTPSlot index={2} className="w-12 h-14 text-xl border-2 rounded-lg bg-white" />
                          <InputOTPSlot index={3} className="w-12 h-14 text-xl border-2 rounded-lg bg-white" />
                          <InputOTPSlot index={4} className="w-12 h-14 text-xl border-2 rounded-lg bg-white" />
                          <InputOTPSlot index={5} className="w-12 h-14 text-xl border-2 rounded-lg bg-white" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>

                  <Button
                    onClick={handleVerifyOTP}
                    disabled={otp.length !== 6 || isLoading}
                    className="w-full h-14 text-lg font-semibold bg-blue-800 hover:bg-blue-900 focus:ring-blue-300"
                  >
                    {isLoading ? "Verifying..." : "Continue"}
                  </Button>

                  <div className="text-center pt-4">
                    <p className="text-sm text-gray-700 mb-3">{"Didn't receive the code?"}</p>
                    <Button
                      variant="link"
                      className="text-base font-medium text-blue-800 hover:text-blue-900 p-0 h-auto"
                      onClick={() => {
                        // Resend OTP logic
                        alert("Code resent!")
                      }}
                    >
                      Resend Code
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer spacing for mobile */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">By continuing, you agree to our Terms of Service</p>
          </div>
        </div>
      </div>
    </div>
  )
}
