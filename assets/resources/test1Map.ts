import { _decorator, Component, Node } from 'cc';
import { addPanelTo, panelPrefabPath, YJPanel } from '../NoUi3/base/node/YJPanel';
const { ccclass, property } = _decorator;

@ccclass('test1Map')
@panelPrefabPath('db://assets/resources/map_panel.prefab')
@addPanelTo('floor')
export class test1Map extends YJPanel {

}


