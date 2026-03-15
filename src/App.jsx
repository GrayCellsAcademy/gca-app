import { useState, useEffect } from "react";
import { onAuthChange, getUser, logoutUser } from "./firebase";
import Auth from "./Auth";
import StudentHome from "./StudentHome";
import TeacherHome from "./TeacherHome";
import DevHome from "./DevHome";

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
  };

  if (authLoading) return <Spinner/>;
  if (!currentUser) return <Auth onAuth={setCurrentUser}/>;

  if (currentUser.role === "student") {
    return <StudentHome user={currentUser} onLogout={handleLogout}/>;
  }
  if (currentUser.role === "teacher") {
    return <TeacherHome user={currentUser} onLogout={handleLogout}/>;
  }
  if (currentUser.role === "developer") {
    return <DevHome user={currentUser} onLogout={handleLogout}/>;
  }

  return <Auth onAuth={setCurrentUser}/>;
}
