import { useState } from 'react';
import Header from '../Header';

export default function HeaderExample() {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 3;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    console.log('Page changed to:', page);
  };

  const handleLogoClick = () => {
    setCurrentPage(1);
    console.log('Logo clicked - returning to home page');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onLogoClick={handleLogoClick}
      />
      
      <div className="p-6">
        <p className="text-muted-foreground">
          Current page: {currentPage}. Click the logo or page numbers to navigate.
        </p>
      </div>
    </div>
  );
}