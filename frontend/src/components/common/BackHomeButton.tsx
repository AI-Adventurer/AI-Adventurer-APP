import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export default function BackHomeButton() {
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="fixed left-4 top-4 z-40"
    >
      <Link to="/">
        <ChevronLeft className="size-4" />
        返回
      </Link>
    </Button>
  );
}
