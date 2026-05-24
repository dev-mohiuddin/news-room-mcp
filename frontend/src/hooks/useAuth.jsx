import { useSelector, useDispatch } from "react-redux";
import { logoutUser } from "@/redux/slice/auth-slice";

export default function useAuth() {
  const dispatch = useDispatch();
  const { user, isAuthenticated, isLoading } = useSelector((state) => state.auth);

  const logout = () => {
    dispatch(logoutUser());
    window.location.href = "/auth/login";
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    role: user?.role ?? null,
    logout,
  };
}
