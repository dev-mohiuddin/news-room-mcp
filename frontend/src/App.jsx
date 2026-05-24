import { useRoutes } from "react-router-dom";
import { publicRoutes, privateRoutes } from "./routes/routes";
import { IsLogin, RoleGuard } from "./pages";

/**
 * Wraps each private route element with IsLogin (auth) and RoleGuard (role).
 * Mirrors amanaah_owner_frontend/src/App.jsx pattern, extended for two panels.
 */
function App() {
  const publicRouteElements = publicRoutes?.map((route) => ({
    path: route.path,
    element: route.element,
  }));

  const privateRouteElements = privateRoutes?.map((route) => ({
    path: route.path,
    element: (
      <IsLogin>
        {route.roles?.length ? (
          <RoleGuard allowedRoles={route.roles}>{route.element}</RoleGuard>
        ) : (
          route.element
        )}
      </IsLogin>
    ),
    children: route.children,
  }));

  const allRoutes = [...privateRouteElements, ...publicRouteElements];

  const routing = useRoutes(allRoutes);

  return <div className="font-body">{routing}</div>;
}

export default App;
