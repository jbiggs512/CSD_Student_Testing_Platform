import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorPage } from './error-page'

interface ErrorBoundaryProps {
  readonly children: ReactNode
  readonly resetKey?: string
  readonly onReset?: () => void
  readonly onReturnToLogin?: () => Promise<void> | void
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Catches unexpected React rendering errors and displays the shared ErrorPage
 * with recovery actions.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled application error:', error, info)
  }

  private handleTryAgain = () => {
    this.setState({ hasError: false })
    this.props.onReset?.()
  }

  private handleReturnToLogin = async () => {
    await this.props.onReturnToLogin?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          statusCode={500}
          title="Something Went Wrong"
          message="An unexpected error occurred while loading this page. You can try again or return to the login page."
          primaryActionLabel="Return to Login"
          onPrimaryAction={this.handleReturnToLogin}
          secondaryActionLabel="Try Again"
          onSecondaryAction={this.handleTryAgain}
        />
      )
    }

    return this.props.children
  }
}
