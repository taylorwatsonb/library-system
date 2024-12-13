import { Switch, Route } from "wouter";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";

function App() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route>404 Page Not Found</Route>
    </Switch>
  );
}

export default App;
