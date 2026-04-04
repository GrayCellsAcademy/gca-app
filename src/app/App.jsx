import { useState, useEffect } from "react";
import { onAuthChange, getUser, logoutUser } from "../core/firebase";
import Auth from "../core/auth/Auth";
import StudentHome from "../views/StudentHome";
import TeacherHome from "../views/TeacherHome";
import DevHome from "../views/DevHome";
import LiveSession from "../live/LiveSession";

function Spinner() {
  return (
    <div style={{
      minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      background:"var(--bg)",flexDirection:"column",gap:16
    }}>
      <div className="spinner" style={{width:40,height:40,borderWidth:4}}/>
      <div style={{color:"var(--text3)",fontSize:14}}>Loading…</div>
    </div>
  );
}

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [screen, setScreen] = useState("home");

  useEffect(()=>{
    const unsub = onAuthChange(async (fbUser)=>{
      if (fbUser) {
        const userData = await getUser(fbUser.uid);
        setCurrentUser(userData);
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return ()=>unsub();
  },[]);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setScreen("home");
  };

  if (authLoading) return <Spinner/>;
  if (!currentUser) return <Auth onAuth={setCurrentUser}/>;

  if (screen === "live") {
    return <LiveSession user={currentUser} onHome={() => setScreen("home")} />;
  }
  if (currentUser.role === "student") {
    return <StudentHome user={currentUser} onLogout={handleLogout} onLiveSession={() => setScreen("live")} />;
  }
  if (currentUser.role === "teacher") {
    return <TeacherHome user={currentUser} onLogout={handleLogout} onLiveSession={() => setScreen("live")} />;
  }
  if (currentUser.role === "developer") {
    return <DevHome user={currentUser} onLogout={handleLogout}/>;
  }
  return <Auth onAuth={setCurrentUser}/>;
}
