/**
 * Created by pmeijer on 3/24/14.
 */

define(function () {
   return [
       {
           "exportedComponentClass": "Modelica.Mechanics.Translational.Components.Spring",
           "components": [
               {
                   "comment": "Linear 1D translational spring",
                   "parameters": [
                       {
                           "modifiers": {
                               "start": "1",
                               "quantity": "\"TranslationalSpringConstant\"",
                               "unit": "\"N/m\"",
                               "min": "0"
                           },
                           "name": "c",
                           "isCyPhySafe": true,
                           "isPublic": true,
                           "value": "",
                           "fullName": "Real",
                           "description": "Spring constant"
                       },
                       {
                           "modifiers": {
                               "quantity": "\"Length\"",
                               "unit": "\"m\"",
                               "min": "0"
                           },
                           "name": "s_rel0",
                           "isCyPhySafe": true,
                           "isPublic": true,
                           "value": 0,
                           "fullName": "Real",
                           "description": "Unstretched spring length"
                       }
                   ],
                   "imports": [],
                   "connectors": [],
                   "extends": [
                       {
                           "fullName": "Modelica.Mechanics.Translational.Interfaces.PartialCompliant",
                           "modifiers": {},
                           "redeclare_parameters": [],
                           "parameters": []
                       }
                   ],
                   "fullName": "Modelica.Mechanics.Translational.Components.Spring",
                   "packages": [],
                   "redeclare_parameters": []
               },
               {
                   "comment": "Compliant connection of two translational 1D flanges",
                   "parameters": [],
                   "imports": [],
                   "connectors": [
                       {
                           "fullName": "Modelica.Mechanics.Translational.Interfaces.Flange_a",
                           "modifiers": {},
                           "name": "flange_a",
                           "parameters": [],
                           "redeclare_parameters": []
                       },
                       {
                           "fullName": "Modelica.Mechanics.Translational.Interfaces.Flange_b",
                           "modifiers": {},
                           "name": "flange_b",
                           "parameters": [],
                           "redeclare_parameters": []
                       }
                   ],
                   "extends": [],
                   "fullName": "Modelica.Mechanics.Translational.Interfaces.PartialCompliant",
                   "packages": [],
                   "redeclare_parameters": []
               }
           ]
       },
       {
           "exportedComponentClass": "Modelica.Mechanics.Translational.Components.Damper",
           "components": [
               {
                   "comment": "Linear 1D translational damper",
                   "parameters": [
                       {
                           "modifiers": {
                               "start": "0",
                               "quantity": "\"TranslationalDampingConstant\"",
                               "unit": "\"N.s/m\"",
                               "min": "0"
                           },
                           "name": "d",
                           "isCyPhySafe": true,
                           "isPublic": true,
                           "value": "",
                           "fullName": "Real",
                           "description": "Damping constant"
                       }
                   ],
                   "imports": [],
                   "connectors": [],
                   "extends": [
                       {
                           "fullName": "Modelica.Mechanics.Translational.Interfaces.PartialCompliantWithRelativeStates",
                           "modifiers": {},
                           "redeclare_parameters": [],
                           "parameters": []
                       },
                       {
                           "fullName": "Modelica.Thermal.HeatTransfer.Interfaces.PartialElementaryConditionalHeatPortWithoutT",
                           "modifiers": {},
                           "redeclare_parameters": [],
                           "parameters": []
                       }
                   ],
                   "fullName": "Modelica.Mechanics.Translational.Components.Damper",
                   "packages": [],
                   "redeclare_parameters": []
               },
               {
                   "comment": "Base model for the compliant connection of two translational 1-dim. shaft flanges where the relative position and relative velocities are used as states",
                   "parameters": [
                       {
                           "modifiers": {},
                           "name": "stateSelect",
                           "isCyPhySafe": true,
                           "isPublic": true,
                           "value": "StateSelect.prefer",
                           "fullName": "StateSelect",
                           "description": "Priority to use phi_rel and w_rel as states"
                       },
                       {
                           "modifiers": {
                               "quantity": "\"Length\"",
                               "unit": "\"m\"",
                               "min": "0"
                           },
                           "name": "s_nominal",
                           "isCyPhySafe": true,
                           "isPublic": true,
                           "value": 0.0001,
                           "fullName": "Real",
                           "description": "Nominal value of s_rel (used for scaling)"
                       }
                   ],
                   "imports": [],
                   "connectors": [
                       {
                           "fullName": "Modelica.Mechanics.Translational.Interfaces.Flange_a",
                           "modifiers": {},
                           "name": "flange_a",
                           "parameters": [],
                           "redeclare_parameters": []
                       },
                       {
                           "fullName": "Modelica.Mechanics.Translational.Interfaces.Flange_b",
                           "modifiers": {},
                           "name": "flange_b",
                           "parameters": [],
                           "redeclare_parameters": []
                       }
                   ],
                   "extends": [],
                   "fullName": "Modelica.Mechanics.Translational.Interfaces.PartialCompliantWithRelativeStates",
                   "packages": [],
                   "redeclare_parameters": []
               },
               {
                   "comment": "Partial model to include a conditional HeatPort in order to dissipate losses, used for textual modeling, i.e., for elementary models",
                   "parameters": [
                       {
                           "modifiers": {},
                           "name": "useHeatPort",
                           "isCyPhySafe": true,
                           "isPublic": true,
                           "value": false,
                           "fullName": "Boolean",
                           "description": "=true, if heatPort is enabled"
                       }
                   ],
                   "imports": [],
                   "connectors": [
                       {
                           "fullName": "Modelica.Thermal.HeatTransfer.Interfaces.HeatPort_a",
                           "modifiers": {
                               "modifications": "public",
                               "Q_flow": "-lossPower"
                           },
                           "name": "heatPort",
                           "parameters": [],
                           "redeclare_parameters": []
                       }
                   ],
                   "extends": [],
                   "fullName": "Modelica.Thermal.HeatTransfer.Interfaces.PartialElementaryConditionalHeatPortWithoutT",
                   "packages": [],
                   "redeclare_parameters": []
               }
           ]
       }
   ];
});