import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

export class ErrorBoundary extends Component<Props,State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return {
            hasError: true
        };
    };

    static componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[Focus Mode Error]', error, errorInfo);
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: 20, color: 'white', textAlign: 'center' }
                }>
                    <p> Ocorreu um erro</p>
                    <p>Não foi possível carregar o modo de foco</p>
                </div>
            )
        }
        return this.props.children;
    }
}