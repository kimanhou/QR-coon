import { useState, type FC } from "react";
import { Button, usePortal } from "@canonical/react-components";
import ManualCheckInModal from "components/ManualCheckInModal";
import type { Person } from "db";

interface Props {
  confirmingPerson: Person;
  onCheckIn: (personId: string) => Promise<void>; // Ensure this returns a promise
}

const ManualCheckInButton: FC<Props> = ({ confirmingPerson, onCheckIn }) => {
  const { openPortal, closePortal, isOpen, Portal } = usePortal();
  const [isLoading, setIsLoading] = useState(false);

  const handleManualCheckIn = async () => {
    setIsLoading(true);
    try {
      await onCheckIn(confirmingPerson.id);
      closePortal();
    } catch (e) {
      console.error("Manual check-in failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={openPortal} className="u-no-margin--bottom" small>
        Check-in
      </Button>

      {isOpen && (
        <Portal>
          <ManualCheckInModal
            confirmingPerson={confirmingPerson}
            handleConfirm={handleManualCheckIn}
            isLoading={isLoading}
            closePortal={closePortal}
          />
        </Portal>
      )}
    </>
  );
};

export default ManualCheckInButton;
