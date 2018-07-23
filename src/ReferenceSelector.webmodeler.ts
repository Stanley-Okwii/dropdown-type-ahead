import { Component, createElement } from "react";

import { parseStyle } from "./utils/ContainerUtils";
import { ReferenceSelector } from "./components/ReferenceSelector";
import { ReferenceSelectorContainerProps } from "./components/ReferenceSelectorContainer";

declare function require(name: string): string;

type VisibilityMap = {
    [P in keyof ReferenceSelectorContainerProps]: boolean;
};

// tslint:disable-next-line class-name
export class preview extends Component<ReferenceSelectorContainerProps, {}> {
    private selected = {
        label: this.props.emptyOptionCaption,
        value: "noGuid"
    };

    render() {
        return createElement(ReferenceSelector as any, {
            attribute: this.props.attribute,
            // data: this.state.options,
            label: this.props.labelCaption,
            selectedValue: this.selected.label,
            showLabel: this.props.showLabel,
            style: parseStyle(this.props.style)
        });
    }
}

export function getPreviewCss() {
    return require("./ui/ReferenceSelector.scss");
}

export function getVisibleProperties(valueMap: ReferenceSelectorContainerProps, visibilityMap: VisibilityMap) {
    visibilityMap.source = valueMap.microflow === "microflow";

    return visibilityMap;
}
