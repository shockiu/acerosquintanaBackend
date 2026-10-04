import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function KpiCard({ label, value, icon: Icon, trend }: { label: string, value: string | number, icon?: React.ElementType, trend?: string }) {
  return (
    <Card className="shadow-card transition-shadow hover:shadow-elevated">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {Icon ? (
          <div className="rounded-md bg-accent p-2 text-accent-foreground"><Icon className="h-4 w-4" /></div>
        ) : null}
      </CardHeader>
      <CardContent>
        <p className="font-heading text-3xl font-bold text-foreground">{value}</p>
        {trend ? <p className="mt-1 text-xs text-muted-foreground">{trend}</p> : null}
      </CardContent>
    </Card>
  );
}
