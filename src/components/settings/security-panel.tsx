'use client';

import { PasswordForm } from './password-form';
import { LinkedDevicesCard } from './linked-devices-card';
import { SettingsPanelHead } from './settings-panel-head';

/**
 * "Login & security" section — groups the former Profile-tab password
 * and active-sessions cards into their own dedicated home.
 */
export function SecurityPanel() {
  return (
    <section className="max-w-2xl animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="Login & security"
        description="Change your password, link browsers, and sign out of devices."
      />
      <div className="space-y-4">
        <PasswordForm />
        <LinkedDevicesCard />
      </div>
    </section>
  );
}
