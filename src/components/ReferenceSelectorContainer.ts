import { ChangeEvent, Component, createElement } from "react";
import { parseStyle } from "../utils/ContainerUtils";
import { FetchDataOptions, FetchedData, fetchData } from "../utils/data";
import { ReferenceSelector, referenceOption } from "./ReferenceSelector";

interface WrapperProps {
    mxObject: mendix.lib.MxObject;
    mxform: mxui.lib.form._FormBase;
    mxContext: mendix.lib.MxContext;
    style?: string;
    class?: string;
}

export interface ReferenceSelectorContainerProps extends WrapperProps {
    attribute: string;
    entityPath: string;
    entityConstraint: string;
    emptyOptionCaption: string;
    labelCaption: string;
    source: "xpath"| "microflow" | "nanoflow";
    sortOrder: "asc" | "des";
    showLabel: string;
    nanoflow: Nanoflow;
    microflow: string;
    onChangeNanoflow: Nanoflow;
    onChangeMicroflow: string;
    onChangeEvent: "callMicroflow" | "callNanoflow";
}

export interface ReferenceSelectorState {
    options: referenceOption[];
    selected: referenceOption;
}

export interface Nanoflow {
    nanoflow: object[];
    paramsSpec: { Progress: string };
}

export default class ReferenceSelectorContainer extends Component<ReferenceSelectorContainerProps, ReferenceSelectorState> {
    private subscriptionHandles: number[] = [];
    readonly state: ReferenceSelectorState = {
        options: [],
        selected: {}
    };
    private readonly handleOnClick: ChangeEvent<HTMLDivElement> = this.onChange.bind(this);

    render() {
        return createElement(ReferenceSelector as any, {
            attribute: this.props.attribute,
            data: this.state.options,
            handleOnchange: this.handleOnClick,
            label: this.props.labelCaption,
            selectedValue: this.state.selected,
            showLabel: this.props.showLabel,
            style: parseStyle(this.props.style)
        });
    }

    componentWillReceiveProps(newProps: ReferenceSelectorContainerProps) {
        if (newProps.mxObject !== this.props.mxObject) {
        this.retrieveOptions(newProps);
        this.resetSubscriptions(newProps.mxObject);
        }
    }

    componentWillUnmount() {
        this.subscriptionHandles.forEach(window.mx.data.unsubscribe);
    }

    private setOptions = (Data: Promise<FetchedData>) => {
        const dataOptions: referenceOption[] = [];
        let selected: referenceOption = {};

        Promise.all([ Data ])
        .then((value) => {
            const mendixObjects = value[0].mxObjects;
            if (this.props.attribute && mendixObjects) {
                for (const mxObject of mendixObjects) {
                    dataOptions.push({ label: mxObject.get(this.props.attribute) as string, guid: mxObject.getGuid() });
                }
            }
            if (this.props.emptyOptionCaption.trim() === "") {
                Promise.all([ this.fetchDataByreference() ])
                .then((defaultvalue) => {
                    const MendixObject = defaultvalue[0];
                    // this.setState({ selected: this.getValue(MendixObject) });
                    selected = this.getValue(MendixObject);
                })
                .catch(message => mx.ui.error(message));
            } else {
                selected = { guid: "default" , label: this.props.emptyOptionCaption };
            }
            this.setState({ options: dataOptions, selected });
        });
    }

    private handleSubscriptions = () => {
        Promise.all([ this.fetchDataByreference() ])
            .then((values) => {
                const MendixObject = values[0];
                this.setState({ selected: this.getValue(MendixObject) });
            })
            .catch(message => mx.ui.error(message));
    }

    private fetchDataByreference(): Promise<mendix.lib.MxObject> {
        return new Promise((resolve) => {
            this.props.mxObject.fetch(this.props.entityPath,
                (value) => {
                resolve(value as any);
            });
        });
    }

    private getValue(mxObject: mendix.lib.MxObject) {
        return {
            guid: mxObject.getGuid(),
            label: mxObject.get(this.props.attribute) as string
        };
    }

    private resetSubscriptions(mxObject?: mendix.lib.MxObject) {
        this.subscriptionHandles.forEach(window.mx.data.unsubscribe);
        this.subscriptionHandles = [];
        const attr = this.props.entityPath.split("/")[0];

        if (mxObject) {
            this.subscriptionHandles.push(window.mx.data.subscribe({
                callback: this.handleSubscriptions,
                guid: mxObject.getGuid()
            }));
            this.subscriptionHandles.push(window.mx.data.subscribe({
                attr,
                callback: this.handleSubscriptions,
                guid: mxObject.getGuid()
            }));
        }
    }

    private onChange(recentSelection: referenceOption) {
        if (!this.props.mxObject) {
            return;
        }

        if (recentSelection.guid) {
        this.props.mxObject.addReference(this.props.entityPath.split("/")[0], recentSelection.guid);
        }
        this.executeOnChangeEvent();
    }

    private executeOnChangeEvent = () => {
        const { mxform, mxObject, onChangeEvent, onChangeMicroflow, onChangeNanoflow } = this.props;
        const context = new mendix.lib.MxContext();
        context.setContext(mxObject.getEntity(), mxObject.getGuid());
        if (onChangeEvent === "callMicroflow" && onChangeMicroflow) {
            window.mx.ui.action(onChangeMicroflow, {
                error: error => window.mx.ui.error(`Error while executing microflow ${onChangeMicroflow}: ${error.message}`), // tslint:disable-line max-line-length
                origin: mxform,
                params: {
                    applyto: "selection",
                    guids: [ mxObject.getGuid() ]
                }
            });
        } else if (onChangeEvent === "callNanoflow" && onChangeNanoflow.nanoflow) {
            window.mx.data.callNanoflow({
                context,
                error: error => window.mx.ui.error(`Error while executing the onchange nanoflow: ${error.message}`),
                nanoflow: onChangeNanoflow,
                origin: mxform
            });
        }
    }

    private retrieveOptions(props: ReferenceSelectorContainerProps) {
        const entity = this.props.entityPath.split("/")[1];
        const { entityConstraint, source, sortOrder, microflow, mxObject, nanoflow } = props;
        const options = {
            constraint: entityConstraint,
            entity,
            guid: mxObject.getGuid(),
            microflow,
            mxform: this.props.mxform,
            nanoflow,
            sortOrder,
            source
        };

        this.setOptions(fetchData(options as FetchDataOptions));
    }
}
