interface PageHeroProps {
  title: string;
  subtitle?: string; // Optional small uppercase text above the title
  description?: string;  // Optional description 
  icon?: React.ReactNode;  // Optional icon next to the description
  children?: React.ReactNode; // Optional right-side content 
}

export function PageHero({ 
  title, 
  subtitle, 
  description, 
  icon, 
  children 
}: Readonly<PageHeroProps>) {
  return (
    <section className="mb-8 flex flex-col justify-between rounded-2xl bg-navy p-10 text-white shadow-md lg:flex-row lg:items-center">
      <div className="mb-6 flex flex-col justify-center lg:mb-0">
        {subtitle && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">
            {subtitle}
          </p>
        )}
        
        <h1 className="mb-2 font-heading text-4xl font-bold tracking-tight text-white">
          {title}
        </h1>

        {(description || icon) && (
          <div className="flex items-center gap-2 text-white/80">
            {icon}
            {description && <span className="text-sm">{description}</span>}
          </div>
        )}
      </div>

      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </section>
  );
}