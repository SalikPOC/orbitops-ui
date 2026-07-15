/** Two versions of a flow for mock-mode visual diffing. */

export const caseRoutingBase = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>64.0</apiVersion>
    <label>Case Routing</label>
    <status>Active</status>
    <start>
        <locationX>176</locationX>
        <locationY>0</locationY>
        <connector><targetReference>Get_Case</targetReference></connector>
    </start>
    <recordLookups>
        <name>Get_Case</name>
        <label>Get Case</label>
        <locationX>176</locationX>
        <locationY>120</locationY>
        <connector><targetReference>Check_Priority</targetReference></connector>
        <object>Case</object>
    </recordLookups>
    <decisions>
        <name>Check_Priority</name>
        <label>Check Priority</label>
        <locationX>176</locationX>
        <locationY>240</locationY>
        <defaultConnector><targetReference>Update_Case</targetReference></defaultConnector>
        <defaultConnectorLabel>Normal</defaultConnectorLabel>
        <rules>
            <name>Is_High</name>
            <label>High priority</label>
            <conditions><leftValueReference>Get_Case.Priority</leftValueReference><operator>EqualTo</operator><rightValue><stringValue>High</stringValue></rightValue></conditions>
            <connector><targetReference>Set_Escalation</targetReference></connector>
        </rules>
    </decisions>
    <assignments>
        <name>Set_Escalation</name>
        <label>Set Escalation</label>
        <locationX>0</locationX>
        <locationY>360</locationY>
        <assignmentItems><assignToReference>Get_Case.IsEscalated</assignToReference><operator>Assign</operator><value><booleanValue>true</booleanValue></value></assignmentItems>
        <connector><targetReference>Update_Case</targetReference></connector>
    </assignments>
    <recordUpdates>
        <name>Update_Case</name>
        <label>Update Case</label>
        <locationX>176</locationX>
        <locationY>480</locationY>
        <inputReference>Get_Case</inputReference>
    </recordUpdates>
</Flow>`;

export const caseRoutingHead = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>64.0</apiVersion>
    <label>Case Routing</label>
    <status>Active</status>
    <start>
        <locationX>176</locationX>
        <locationY>0</locationY>
        <connector><targetReference>Get_Case</targetReference></connector>
    </start>
    <recordLookups>
        <name>Get_Case</name>
        <label>Get Case</label>
        <locationX>176</locationX>
        <locationY>120</locationY>
        <connector><targetReference>Check_Priority</targetReference></connector>
        <object>Case</object>
    </recordLookups>
    <decisions>
        <name>Check_Priority</name>
        <label>Check Priority</label>
        <locationX>176</locationX>
        <locationY>240</locationY>
        <defaultConnector><targetReference>Update_Case</targetReference></defaultConnector>
        <defaultConnectorLabel>Normal</defaultConnectorLabel>
        <rules>
            <name>Is_High</name>
            <label>High or urgent</label>
            <conditions><leftValueReference>Get_Case.Priority</leftValueReference><operator>In</operator><rightValue><stringValue>High;Urgent</stringValue></rightValue></conditions>
            <connector><targetReference>Notify_Owner</targetReference></connector>
        </rules>
    </decisions>
    <actionCalls>
        <name>Notify_Owner</name>
        <label>Notify Owner</label>
        <locationX>0</locationX>
        <locationY>360</locationY>
        <actionName>emailSimple</actionName>
        <actionType>emailSimple</actionType>
        <connector><targetReference>Update_Case</targetReference></connector>
    </actionCalls>
    <recordUpdates>
        <name>Update_Case</name>
        <label>Update Case</label>
        <locationX>176</locationX>
        <locationY>480</locationY>
        <inputReference>Get_Case</inputReference>
    </recordUpdates>
    <variables>
        <name>OwnerEmail</name>
        <dataType>String</dataType>
        <isCollection>false</isCollection>
    </variables>
</Flow>`;
