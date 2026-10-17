"use client";

import { Button } from "@workspace/ui/components/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import SendCode from "@/sections/auth/send-code";

// The backend asks for the current password when the account has one and
// otherwise for a security code sent to the bound address. The client cannot
// tell which, so the password is the default and the code is opt-in.
export type VerifyBy = "password" | "code";

interface CurrentCredentialFieldsProps {
  /** The form field that carries the current password. */
  passwordName: "password" | "old_password";
  verifyBy?: VerifyBy;
  onVerifyByChange?: (verifyBy: VerifyBy) => void;
  /** The bound email the security code goes to; without one only the password is offered. */
  email?: string;
  /** Shown under the password field when there is no email to send a code to. */
  hint?: string;
}

export default function CurrentCredentialFields({
  passwordName,
  verifyBy = "password",
  onVerifyByChange,
  email,
  hint,
}: CurrentCredentialFieldsProps) {
  const { t } = useTranslation("profile");
  const { control, setValue, clearErrors } = useFormContext();

  const switchTo = (next: VerifyBy) => {
    setValue(passwordName, "");
    setValue("current_code", "");
    clearErrors([passwordName, "current_code"]);
    onVerifyByChange?.(next);
  };

  return (
    <div className="space-y-2">
      {verifyBy === "code" && email ? (
        <FormField
          control={control}
          name="current_code"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex gap-2">
                  <Input
                    placeholder={t(
                      "currentCredential.code",
                      "Code sent to {{email}}",
                      { email }
                    )}
                    type="text"
                    {...field}
                  />
                  <SendCode params={{ email, type: 2 }} type="email" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <FormField
          control={control}
          name={passwordName}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  autoComplete="current-password"
                  placeholder={t(
                    "currentCredential.password",
                    "Current password"
                  )}
                  type="password"
                  {...field}
                />
              </FormControl>
              {!email && hint && <FormDescription>{hint}</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {email && (
        <Button
          className="h-auto p-0"
          onClick={() => switchTo(verifyBy === "code" ? "password" : "code")}
          size="sm"
          type="button"
          variant="link"
        >
          {verifyBy === "code"
            ? t("currentCredential.usePassword", "Use your current password")
            : t(
                "currentCredential.useCode",
                "No password set? Verify with a code sent to {{email}}",
                { email }
              )}
        </Button>
      )}
    </div>
  );
}
