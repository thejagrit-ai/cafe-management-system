import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught component error:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      // If it's a transient translate/removeChild error, we can offer instant refresh
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
          <div className="max-w-md w-full p-6 rounded-2xl bg-card border border-border text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="font-serif text-xl font-bold">Ocurrió un error inesperado</h2>
              <p className="text-xs text-muted-foreground">
                La aplicación encontró una discordancia en la interfaz. Haz clic para recargar la vista.
              </p>
            </div>

            <Button
              onClick={this.handleReset}
              className="w-full rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs font-semibold h-10 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Recargar Página</span>
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
