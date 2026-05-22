import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
}

class ErrorBoundary
  extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(
    error: any
  ) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(
    error: any,
    info: any
  ) {

    console.error(
      "APPLICATION ERROR:",
      error,
      info
    );
  }

  render() {

    if (this.state.hasError) {

      return (

        <div
          style={{
            background: "#111",
            color: "white",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
          }}
        >

          <h1>
            Application Error
          </h1>

          <p>
            Something crashed inside
            the application.
          </p>

          <button
            onClick={() =>
              window.location.reload()
            }
            style={{
              padding: "12px 20px",
              marginTop: "20px",
              cursor: "pointer",
            }}
          >
            Reload Site
          </button>

        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
