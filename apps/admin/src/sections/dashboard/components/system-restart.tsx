"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Icon } from "@workspace/ui/composed/icon";
import { postToolRestart as restartSystem } from "@workspace/ui/services/admin/admin";
import { useState } from "react";
import { useTranslation } from "react-i18next";

// Restart flow moved unchanged from the former system-version-card: confirm,
// request, wait 5s, close. Failures are reported by the request layer and the
// confirm button becomes clickable again.
export default function SystemRestart() {
  const { t } = useTranslation("tool");
  const [openRestart, setOpenRestart] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  return (
    <AlertDialog onOpenChange={setOpenRestart} open={openRestart}>
      <AlertDialogTrigger asChild>
        <Button
          className="h-8 shrink-0 border-ds-danger/40 text-ds-danger hover:bg-ds-danger-soft hover:text-ds-danger"
          size="sm"
          variant="outline"
        >
          {t("systemReboot", "System Reboot")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="admin-home">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("confirmSystemReboot", "Confirm System Reboot")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              "rebootDescription",
              "Are you sure you want to reboot the system? This action cannot be undone."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel", "Cancel")}</AlertDialogCancel>
          <Button
            disabled={isRestarting}
            onClick={async () => {
              setIsRestarting(true);
              try {
                await restartSystem();
                await new Promise((resolve) => setTimeout(resolve, 5000));
                setOpenRestart(false);
              } catch {
                // The request layer reports the failure.
              } finally {
                setIsRestarting(false);
              }
            }}
          >
            {isRestarting && (
              <Icon className="mr-2 animate-spin" icon="mdi:loading" />
            )}
            {isRestarting
              ? t("rebooting", "Rebooting...")
              : t("confirmReboot", "Confirm Reboot")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
