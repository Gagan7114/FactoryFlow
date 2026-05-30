## Gate Flow Updation:

```
direction down
colorMode pastel
styleMode shadow
typeface clean

Start [shape: oval, label: "Open Gate module", color: blue]

GateHome [label: "Gate home", color: blue] {
  NewMovement [label: "New Movement"]
  TodayQueues [label: "Today queues"]
  AdvancedTypes [label: "Advanced: All Entry Types"]
}

QueuePanel [label: "Operational queues", color: gray] {
  WaitingInside [label: "Vehicles waiting inside"]
  PendingGateOut [label: "Awaiting gate out"]
  PendingWeighment [label: "Pending weighment"]
  PendingReview [label: "Pending review"]
  CompletedToday [label: "Completed today"]
}

ClickFlow [label: "Click-based guided flow", color: green] {
  MovementKind [shape: diamond, label: "Vehicle or person?"]
  PersonEntry [label: "Visitor / labour entry"]
  VehicleDirection [shape: diamond, label: "In, out, or return?"]
  CaptureIdentity [label: "Enter or scan vehicle number"]
  CaptureDocument [shape: diamond, label: "Document available?"]
  DocumentLookup [label: "Scan or enter PO, invoice, transfer, gatepass"]
  NoDocumentReason [label: "Pick simple reason"]
  SuggestedType [label: "System suggests entry type"]
  ConfirmType [shape: diamond, label: "Confirm?"]
  ManualAdjust [label: "Change suggestion"]
}

InternalMapping [label: "Internal entry type mapping", color: orange] {
  RawMaterial [label: "PO + inward -> Raw Material"]
  DailyNeeds [label: "Routine supply -> Daily Needs"]
  Maintenance [label: "Spares/tools -> Maintenance"]
  Construction [label: "Civil/building -> Construction"]
  EmptyVehicleIn [label: "Empty vehicle entering -> Empty Vehicle In"]
  EmptyVehicleOut [label: "Inside empty vehicle leaving -> Empty Vehicle Out"]
  SalesDispatch [label: "Invoice/dispatch doc -> Sales Dispatch Out"]
  BSTOut [label: "Stock transfer out -> BST Out"]
  BSTIn [label: "Stock transfer received -> BST In"]
  BSTReturn [label: "BST returned -> BST Return"]
  CustomerReturn [label: "Customer return invoice -> Goods Return"]
  RejectedQCReturn [label: "Rejected QC ref -> Rejected QC Return"]
  RepairMovement [label: "Repair parts -> Repair In/Out"]
  JobWork [label: "Oil refining/job work -> Job Work"]
}

GuidedSteps [label: "Show only required steps", color: purple] {
  StepVehicle [label: "Vehicle and driver"]
  StepPerson [label: "Person details"]
  StepMaterial [label: "Material or goods"]
  StepDocument [label: "Linked document"]
  StepWeighment [label: "Weighment if required"]
  StepAttachments [label: "Attachments if required"]
  StepGatepass [label: "Gatepass if required"]
  Review [label: "Review"]
}

Completion [label: "Completion", color: teal] {
  SaveDraft [label: "Auto-save draft"]
  CompleteEntry [label: "Complete entry"]
  PrintSlip [label: "Print slip / pass when needed"]
  UpdateQueues [label: "Update queues and dashboards"]
}

End [shape: oval, label: "Entry done", color: blue]

Start > GateHome
GateHome > NewMovement: primary action
TodayQueues > QueuePanel
QueuePanel > PendingGateOut: continue existing vehicle
QueuePanel > PendingWeighment: complete next step
QueuePanel > PendingReview: review and finish
PendingGateOut > GuidedSteps
PendingWeighment > GuidedSteps
PendingReview > Review

NewMovement > MovementKind
MovementKind > PersonEntry: Person
PersonEntry > StepPerson
MovementKind > VehicleDirection: Vehicle
VehicleDirection > CaptureIdentity
CaptureIdentity > CaptureDocument
CaptureDocument > DocumentLookup: Yes
CaptureDocument > NoDocumentReason: No
DocumentLookup > SuggestedType
NoDocumentReason > SuggestedType
SuggestedType > ConfirmType
ConfirmType > GuidedSteps: Yes
ConfirmType > ManualAdjust: No
ManualAdjust > SuggestedType

SuggestedType > RawMaterial: PO inward
SuggestedType > DailyNeeds: Routine supply
SuggestedType > Maintenance: Spares/tools
SuggestedType > Construction: Civil material
SuggestedType > EmptyVehicleIn: Empty in
SuggestedType > EmptyVehicleOut: Empty out
SuggestedType > SalesDispatch: Invoice out
SuggestedType > BSTOut: Transfer out
SuggestedType > BSTIn: Transfer in
SuggestedType > BSTReturn: Transfer returned
SuggestedType > CustomerReturn: Customer return
SuggestedType > RejectedQCReturn: QC rejected
SuggestedType > RepairMovement: Repair parts
SuggestedType > JobWork: Job work

GuidedSteps > SaveDraft
GuidedSteps > StepVehicle: vehicle flows
GuidedSteps > StepPerson: person flows
StepVehicle > StepDocument
StepDocument > StepMaterial
StepMaterial > StepWeighment: if required
StepMaterial > StepAttachments: if no weighment
StepWeighment > StepAttachments
StepAttachments > StepGatepass: if required
StepAttachments > Review: if no gatepass
StepGatepass > Review
StepPerson > Review
Review > CompleteEntry
CompleteEntry > PrintSlip
PrintSlip > UpdateQueues
UpdateQueues > End
```