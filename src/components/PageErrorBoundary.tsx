import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@heroui/react'

interface PageErrorBoundaryProps {
  /** Page name, for the message and the test id. */
  name: string
  children: ReactNode
}

interface PageErrorBoundaryState {
  failed: boolean
}

/**
 * Keeps one page's render error from blanking the whole kiosk: the shell, header and navigation stay
 * up and the pane offers a retry. It catches errors thrown while rendering, not in event handlers or
 * async code. Each page has its own instance, so switching to another page is always possible.
 */
export class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  state: PageErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): PageErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Page "${this.props.name}" failed to render`, error, info.componentStack)
  }

  private retry = () => this.setState({ failed: false })

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <section
        role="alert"
        data-testid={`pane-${this.props.name}-error`}
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center"
      >
        <p className="text-foreground text-lg font-semibold">This page failed to load.</p>
        <p className="text-muted text-sm">The rest of the dashboard is still working.</p>
        <Button className="min-h-14 min-w-40" onPress={this.retry}>
          Try again
        </Button>
      </section>
    )
  }
}
