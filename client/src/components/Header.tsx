import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import logoUrl from '@assets/generated_images/OBTV_streaming_service_logo_597d82d5.png';

interface HeaderProps {
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onLogoClick?: () => void;
}

export default function Header({ 
  currentPage = 1, 
  totalPages = 3, 
  onPageChange,
  onLogoClick 
}: HeaderProps) {
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      console.log('Navigate to previous page:', currentPage - 1);
      onPageChange?.(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      console.log('Navigate to next page:', currentPage + 1);
      onPageChange?.(currentPage + 1);
    }
  };

  const handleLogoClick = () => {
    console.log('OBTV logo clicked - navigate to home');
    onLogoClick?.();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleLogoClick();
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-background/95 backdrop-blur-sm border-b border-border/20">
      {/* OBTV Logo */}
      <div 
        className="flex-shrink-0 cursor-pointer transition-transform duration-200 focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none rounded-md"
        tabIndex={0}
        onClick={handleLogoClick}
        onKeyDown={handleKeyPress}
        onMouseEnter={() => setIsLogoHovered(true)}
        onMouseLeave={() => setIsLogoHovered(false)}
        data-testid="logo-obtv"
        style={{
          transform: isLogoHovered ? 'scale(1.05)' : 'scale(1)'
        }}
      >
        <img 
          src={logoUrl} 
          alt="OBTV" 
          className="h-12 w-auto"
          onError={(e) => {
            // Fallback to text logo if image fails
            e.currentTarget.style.display = 'none';
            const textLogo = document.createElement('div');
            textLogo.textContent = 'OBTV';
            textLogo.className = 'text-2xl font-bold text-primary';
            e.currentTarget.parentNode?.appendChild(textLogo);
          }}
        />
      </div>

      {/* Center spacing */}
      <div className="flex-1" />

      {/* Pagination Controls */}
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          disabled={currentPage <= 1}
          onClick={handlePrevPage}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30 focus-visible:ring-4 focus-visible:ring-primary"
          data-testid="button-prev-page"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              size="sm"
              variant={page === currentPage ? "default" : "ghost"}
              onClick={() => {
                console.log('Navigate to page:', page);
                onPageChange?.(page);
              }}
              className={`
                w-8 h-8 p-0 text-sm font-medium transition-all duration-200
                ${page === currentPage 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }
                focus-visible:ring-4 focus-visible:ring-primary
              `}
              data-testid={`button-page-${page}`}
            >
              {page}
            </Button>
          ))}
        </div>

        <Button
          size="icon"
          variant="ghost"
          disabled={currentPage >= totalPages}
          onClick={handleNextPage}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30 focus-visible:ring-4 focus-visible:ring-primary"
          data-testid="button-next-page"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>

        {/* Page Info */}
        <span className="ml-4 text-sm text-muted-foreground" data-testid="text-page-info">
          Page {currentPage} of {totalPages}
        </span>
      </div>
    </header>
  );
}