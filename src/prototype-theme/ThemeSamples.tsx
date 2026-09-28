// PROTOTYPE, throwaway — ticket 05 (kiosk dark-theme mapping).
// A few installed Coss primitives, side by side with real kiosk content, so
// the theme variant's legibility/contrast can be judged in place.
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'

export function ThemeSamples() {
  return (
    <Card style={{ margin: '12px 0', padding: 16 }}>
      <CardHeader>
        <CardTitle>Coss sample (prototype)</CardTitle>
      </CardHeader>
      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Badge>Badge</Badge>
        </div>
        <Tabs defaultValue="tanks">
          <TabsList>
            <TabsTab value="tanks">Tanks</TabsTab>
            <TabsTab value="power">Power</TabsTab>
            <TabsTab value="switches">Switches</TabsTab>
          </TabsList>
          <TabsPanel value="tanks">Tanks panel content sample.</TabsPanel>
          <TabsPanel value="power">Power panel content sample.</TabsPanel>
          <TabsPanel value="switches">Switches panel content sample.</TabsPanel>
        </Tabs>
      </CardContent>
    </Card>
  )
}
