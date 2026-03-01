import { Card, CardContent, CardHeader } from './Card'

export function FeatureGrid({ title, description, features = [] }) {
  return (
    <section className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6">
      {title || description ? (
        <header className="mx-auto max-w-3xl text-center space-y-4">
          {title ? <h2 className="text-3xl font-semibold text-surface-foreground">{title}</h2> : null}
          {description ? <p className="text-base text-muted-foreground">{description}</p> : null}
        </header>
      ) : null}
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ eyebrow, name, summary, body, icon: Icon }) => (
          <Card key={name} className="h-full">
            <CardHeader eyebrow={eyebrow} title={name} description={summary} className="items-start" />
            {Icon ? (
              <div className="mt-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Icon className="h-6 w-6" />
              </div>
            ) : null}
            {body ? <CardContent>{body}</CardContent> : null}
          </Card>
        ))}
      </div>
    </section>
  )
}

