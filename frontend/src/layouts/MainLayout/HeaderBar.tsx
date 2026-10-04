export default function HeaderBar() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle would go here */}
      </div>
      <div className="flex items-center gap-4">
        {/* User menu or notifications would go here */}
      </div>
    </header>
  );
}
