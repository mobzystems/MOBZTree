import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSquare as falseIcon, faSquareCheck as trueIcon, faEye as visibleIcon, faEyeSlash as hiddenIcon } from "@fortawesome/free-regular-svg-icons";

export function StateIcon(props: {
  state: boolean,
  trueIcon: IconProp,
  falseIcon: IconProp
}) {
  return (
    <span className="icon">
      <FontAwesomeIcon icon={props.state ? props.trueIcon : props.falseIcon} />
    </span>
  );
}

export function CheckBoxIcon(props: {
  state: boolean
}) {
  return <StateIcon state={props.state} trueIcon={trueIcon} falseIcon={falseIcon} />;
}

export function VisibleIcon(props: {
  state: boolean
}) {
  return <StateIcon state={props.state} trueIcon={visibleIcon} falseIcon={hiddenIcon} />;
}