//  Topic Router 
// Receives a topicId and renders the correct player component.
// StudentHome calls this instead of importing any player directly.

import { getTopic } from "./registry";

export default function TopicRouter({ topicId, user, onHome }) {
  const topic = getTopic(topicId);

  if (!topic) {
    return (
      <div style={{
        display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", padding:"60px 20px", textAlign:"center"
      }}>
        <div style={{fontSize:48, marginBottom:16}}></div>
        <h3 style={{fontSize:20, fontWeight:700, marginBottom:8, color:"var(--text)"}}>
          Topic not found
        </h3>
        <p style={{color:"var(--text2)", fontSize:14, marginBottom:24}}>
          This topic may have been removed or is no longer available.
        </p>
        <button className="btn btn-ghost" onClick={onHome}> Back</button>
      </div>
    );
  }

  const { Player } = topic;

  return <Player user={user} topic={topic} onHome={onHome} />;
}
