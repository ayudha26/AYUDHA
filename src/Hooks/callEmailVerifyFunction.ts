import { Alert } from "react-native";

export const callEmailVerifyFunction = async (email: string, handleSubmit: ((arg0: number) => void) | undefined) => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const resendApiKey = process.env.EXPO_PUBLIC_RESEND_API_KEY?.trim();

    if (!resendApiKey || resendApiKey === "YOUR_RESEND_API_KEY") {
      Alert.alert(
        "Resend not configured",
        "Set EXPO_PUBLIC_RESEND_API_KEY in your .env file with a real Resend API key, then restart Expo."
      );
      return;
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "YourAppName <onboarding@appname.co.uk>",
          to: [email],
          subject: "Add You App Name Email Verification",
          html: `<p>Enter the code into the verification screen and your email will be validated</strong><strong> <br/>${randomCode}</strong>`,
        }),
      });
  
      const data = await res.json();
      console.log("data", data);
      if (res.status === 200) {
        handleSubmit && handleSubmit(randomCode);
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      Alert.alert((error as Error).message);
    }
  };
  
