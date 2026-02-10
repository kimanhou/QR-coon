import { Button, Card } from "@canonical/react-components";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home row">
      <Card onClick={() => navigate("/events")}>
        <h3 className="p-heading--3">Events</h3>
        <p>
          For each event, you can view attendee lists, track the Naughty List,
          and launch the QR scanner for real-time check-ins.
        </p>
        <Button appearance="positive">Go to events</Button>
      </Card>

      <Card onClick={() => navigate("/badges")}>
        <h3 className="p-heading--3">QR code generator</h3>
        <p>
          Generate print-ready name badges with secure QR codes for each
          participant for sprints.
        </p>
        <Button appearance="positive">Generate QR codes</Button>
      </Card>
    </div>
  );
};

export default Home;
