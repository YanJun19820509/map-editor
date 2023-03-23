import { _decorator, Component, SpriteAtlas, Node, SpriteFrame, UITransform, Layers, Sprite, TextAsset, Asset, JsonAsset } from 'cc';
import { Enum } from 'cc';
import { CCClass } from 'cc';
import { assetManager } from 'cc';
import { AssetInfo } from '../../cc_editor/@types/packages/asset-db/@types/public';
import { no } from '../../NoUi3/no';
import { CreateLandform } from './CreateLandform';
import { CreateMapLands } from './CreateMapLands';
import { Tile } from './Tile';
const { ccclass, property, executeInEditMode } = _decorator;

enum ProjectName { }

@ccclass('LoadProject')
@executeInEditMode()
export class LoadProject extends Component {
    @property({ type: Enum(ProjectName) })
    project: number = 0;
    @property({ type: Node })
    panel: Node = null;
    @property({ type: Node })
    mapPanel: Node = null;
    @property({ displayName: '保存' })
    save: boolean = false;

    private proDirs: string[] = [];
    private proNames: string[] = [];
    private curProject: number = 0;
    private proConfig: any;

    async onLoad() {
        // let info = await Editor.Message.request('asset-db', 'query-asset-info', 'db://assets/projects/test1/Isometric_Tower_Defense_Pack.png');
        // console.log(info);
        this.getProjects();
    }

    onEnable() {
        this.curProject = this.project;
    }

    private getProjects() {
        let names = { '': 0 };
        this.proDirs.length = 0;
        this.proNames.length = 0;
        Editor.Message.request('asset-db', 'query-assets', { ccType: 'cc.SpriteAtlas' }).then((assets: SpriteAtlas[]) => {
            assets.forEach((atlas, i) => {
                let nd = this.getProjectNameDir(atlas);
                if (nd && !names[nd.name]) {
                    names[nd.name] = i + 1;
                    this.proDirs[i + 1] = nd.dir;
                    this.proNames[i + 1] = nd.name;
                }
            });
            this.setEnum(names);
        });
    }

    private getProjectNameDir(atlas: SpriteAtlas): { name: string, dir: string } {
        const atlasName: string = atlas.name, url: string = atlas['url'], root = 'db://assets/projects/';
        console.log(url);
        if (url.indexOf(root) == -1) return null;
        const dir = url.replace('/' + atlasName, '');
        const name = dir.replace(root, '');
        return { name: name, dir: dir };
    }

    private setEnum(obj: any) {
        let e = Enum(obj);
        let list = Enum.getList(e);
        CCClass.Attr.setClassAttr(LoadProject, 'project', 'enumList', list);
    }

    update() {
        if (this.project != this.curProject) {
            this.curProject = this.project;
            this.loadProjectFile();
        }
        if (this.save) {
            this.save = false;
            this.saveProject();
        }
    }

    private loadProjectFile() {
        this.panel.removeAllChildren();
        this.mapPanel.removeAllChildren();
        const dir = this.proDirs[this.curProject],
            name = this.proNames[this.curProject],
            mep = `${dir}/${name}.mep.json`;
        no.assetBundleManager.loadFileInEditorMode(mep, JsonAsset, (file: JsonAsset, info: AssetInfo) => {
            this.proConfig = file.json;
            this.loadAtlasFiles(dir);
        }, () => {
            this.proConfig = {};
            this.loadAtlasFiles(dir);
        });
    }

    private loadAtlasFiles(dir: string) {
        Editor.Message.request('asset-db', 'query-assets', { ccType: 'cc.SpriteAtlas' }).then((assets: any[]) => {
            let aa = [];
            assets.forEach(a => {
                if (a['url'].indexOf(dir) == 0) {
                    aa[aa.length] = { uuid: a.uuid, type: SpriteAtlas };
                }
            });
            assetManager.loadAny(aa, null, (err, items: SpriteAtlas | SpriteAtlas[]) => {
                if (!err) {
                    items = [].concat(items);
                    let atlases: SpriteAtlas[] = [];
                    items.forEach((atlas, i) => {
                        atlases.push(atlas);
                    });
                    this.createTiles(atlases);
                }
            });
        });
    }

    private createTiles(atlases: SpriteAtlas[]) {
        atlases.forEach(atlas => {
            atlas.getSpriteFrames().forEach(sf => {
                this.createTile(sf);
            });
        });
        this.createLands();
    }

    private createTile(sf: SpriteFrame) {
        let node = new Node(sf.name);
        node.layer = Layers.Enum.UI_2D;
        node.addComponent(UITransform);
        node.addComponent(Tile).setTile(sf, this.proConfig['tiles']?.[sf.name]);
        node.parent = this.panel;
    }

    private createLands() {
        const allTiles = this.panel.getComponentsInChildren(Tile);
        let lands = this.proConfig['lands'] || {};
        for (const name in lands) {
            this.mapPanel?.getComponent(CreateMapLands).createLand(lands[name], allTiles);
        }
    }

    private saveProject() {
        if (!this.proConfig)
            this.proConfig = {};
        let a = {};
        const tiles = this.panel.getComponentsInChildren(Tile);
        tiles.forEach(tile => {
            a[tile.tileName] = tile.config;
        });
        this.proConfig['tiles'] = a;

        let b = {};
        const createLandForms = this.mapPanel?.getComponentsInChildren(CreateLandform) || [];
        createLandForms.forEach(clf => {
            b[clf.node.name] = clf.config;
        });
        this.proConfig['lands'] = b;

        const file = `${this.proDirs[this.curProject]}/${this.proNames[this.curProject]}.mep.json`;
        console.log(`save ${file}`);
        Editor.Message.send('asset-db', 'create-asset', file, JSON.stringify(this.proConfig), { overwrite: true });
    }

    // private showDialog() {
    //     Editor.Dialog.select({
    //         title: '选择项目根目录',
    //         path: Editor.Project.path + '\\assets\\projects',
    //         multi: false,
    //         type: 'directory',
    //         button: '选择'
    //     }).then(a => {
    //         if (!a.canceled) {
    //             let path = a.filePaths[0];
    //             // console.log(path);
    //             path = path.replace(/\\/g, '/');
    //             let root = Editor.Project.path.replace(/\\/g, '/');
    //             path = path.replace(root + '/', 'db://');
    //             // console.log(path);
    //             for (const name in infos) {
    //                 const file = `${path}/${name}.json`;
    //                 console.log(`save ${file}`);
    //                 Editor.Message.send('asset-db', 'create-asset', file, JSON.stringify(infos[name]), { overwrite: true });
    //             }
    //         }
    //     });
    // }


}


