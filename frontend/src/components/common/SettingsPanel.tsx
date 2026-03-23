import { Moon, Settings2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/components/theme-provider';

type SettingsPanelProps = {
  showDebug: boolean;
  onShowDebugChange: (nextValue: boolean) => void;
};

export default function SettingsPanel({
  showDebug,
  onShowDebugChange,
}: SettingsPanelProps) {
  const { theme, setTheme } = useTheme();

  const isDarkMode =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="fixed right-4 top-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings2 className="size-4" />
            Settings
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Developer Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <div className="flex items-center justify-between gap-3 px-2 py-1.5 text-sm">
            <span className="inline-flex items-center gap-2">
              <Moon className="size-4 text-muted-foreground" />
              Dark Mode
            </span>
            <Switch
              checked={isDarkMode}
              onCheckedChange={(checked) =>
                setTheme(checked ? 'dark' : 'light')
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3 px-2 py-1.5 text-sm">
            <span>Show Debug Panel</span>
            <Switch checked={showDebug} onCheckedChange={onShowDebugChange} />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
