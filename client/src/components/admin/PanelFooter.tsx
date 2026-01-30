import { Button } from '../ui/Button'
import { PANEL_FOOTER } from './EditPanel'

interface PanelFooterProps {
  isPending: boolean
  isDirty: boolean
  onCancel: () => void
}

export function PanelFooter({ isPending, isDirty, onCancel }: PanelFooterProps) {
  return (
    <div className={PANEL_FOOTER}>
      <Button type="submit" loading={isPending} disabled={!isDirty}>Save</Button>
      <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
    </div>
  )
}
