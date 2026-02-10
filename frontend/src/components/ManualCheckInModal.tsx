import type { ChangeEvent, FC, KeyboardEvent } from "react";
import { useState } from "react";
import { ActionButton, Input, Modal } from "@canonical/react-components";
import type { Person } from "../db";

interface Props {
  confirmingPerson: Person;
  handleConfirm: () => void;
  isLoading: boolean;
  closePortal: () => void;
}

const ManualCheckInModal: FC<Props> = ({
  confirmingPerson,
  handleConfirm,
  isLoading,
  closePortal,
}) => {
  const [disableConfirm, setDisableConfirm] = useState(true);

  const handleConfirmInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Only enable if the user types exactly "CONFIRM"
    setDisableConfirm(e.target.value !== "CONFIRM");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !disableConfirm && !isLoading) {
      handleConfirm();
    }
  };

  return (
    <Modal
      title="Confirm manual check-in"
      className="manual-check-in-modal"
      close={closePortal}
      buttonRow={[
        <span key="confirm-input" className="input-container">
          <Input
            name="confirm-input"
            type="text"
            onChange={handleConfirmInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type CONFIRM to proceed"
            className="u-no-margin--bottom"
            autoFocus
          />
        </span>,
        <ActionButton
          key="confirm-action-button"
          appearance="positive"
          className="u-no-margin--bottom"
          onClick={handleConfirm}
          loading={isLoading}
          disabled={disableConfirm}
        >
          Check-in {confirmingPerson.firstName} {confirmingPerson.lastName}
        </ActionButton>,
      ]}
    >
      <p>
        You are manually checking in{" "}
        <strong>
          {confirmingPerson.firstName} {confirmingPerson.lastName}
        </strong>
        .
      </p>
      <p className="p-text--small u-text--muted">
        This action will record the entry as a <strong>manual check-in</strong>.
      </p>
    </Modal>
  );
};

export default ManualCheckInModal;
