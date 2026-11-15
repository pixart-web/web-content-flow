// L4c (decision L-8): asks macOS to confirm the logged-in user with Touch ID
// or the account password, in the system dialog. The password never reaches
// Web Content Flow. Usage:
//   wcf-os-auth --check            exit 0 if the Mac can authenticate the owner
//   wcf-os-auth "<reason>"         exit 0 authenticated, 1 denied, 3 unavailable
import Foundation
import LocalAuthentication

let arguments = Array(CommandLine.arguments.dropFirst())
let context = LAContext()
var availability: NSError?
let available = context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &availability)

if arguments.first == "--check" {
  print(available ? "available" : "unavailable")
  exit(available ? 0 : 3)
}
guard available else {
  print("unavailable")
  exit(3)
}

let reason = arguments.first ?? "reset the Web Content Flow password"
let done = DispatchSemaphore(value: 0)
var authenticated = false
context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, _ in
  authenticated = success
  done.signal()
}
done.wait()
print(authenticated ? "authenticated" : "denied")
exit(authenticated ? 0 : 1)
