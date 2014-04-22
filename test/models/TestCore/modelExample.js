/**
* Generated by MockModelGenerator from webgme on Tue Apr 22 2014 12:36:05 GMT-0500 (Central Daylight Time).
*/

define(['mocks/CoreMock'], function (CoreMock) {
    var core = new CoreMock(10),
        META;

    META = createMETATypesTests(core);

    var ID957a9d0e_8dfb_94e5_155b_7dff7c931bd4 = core.createNode({base: META.ModelElement, parent: core._rootNode});
    core.setAttribute(ID957a9d0e_8dfb_94e5_155b_7dff7c931bd4, 'name', 'Models');


    var ID93c9cb88_ffbc_42fb_4569_7e76b8105152 = core.createNode({
        base: META.ModelElement,
        parent: ID957a9d0e_8dfb_94e5_155b_7dff7c931bd4
    });
    core.setAttribute(ID93c9cb88_ffbc_42fb_4569_7e76b8105152, 'name', 'ReferenceExample');

    var IDeb3d1ee2_a339_b035_a497_6f58c63cdfc7 = core.createNode({
        base: META.ModelElement,
        parent: ID957a9d0e_8dfb_94e5_155b_7dff7c931bd4
    });
    core.setAttribute(IDeb3d1ee2_a339_b035_a497_6f58c63cdfc7, 'name', 'ConnectionExample');

    var ID90d4ea37_2838_0686_adfd_19ae2d7195fa = core.createNode({
        base: META.ModelElement,
        parent: ID957a9d0e_8dfb_94e5_155b_7dff7c931bd4
    });
    core.setAttribute(ID90d4ea37_2838_0686_adfd_19ae2d7195fa, 'name', 'ParentExample');

    var ID03f45eef_42a9_3b81_6577_83ae433824ef = core.createNode({
        base: META.ModelElement,
        parent: ID957a9d0e_8dfb_94e5_155b_7dff7c931bd4
    });
    core.setAttribute(ID03f45eef_42a9_3b81_6577_83ae433824ef, 'name', 'RecursiveChildrenExample');

    var IDe8ed0ee5_68b7_727e_70f0_7adcb0d9537a = core.createNode({
        base: META.ModelElement,
        parent: ID90d4ea37_2838_0686_adfd_19ae2d7195fa
    });
    core.setAttribute(IDe8ed0ee5_68b7_727e_70f0_7adcb0d9537a, 'name', 'm_parent');

    var IDdc1684a5_42e2_2a9e_0a84_a3e6e7144846 = core.createNode({
        base: META.ModelElement,
        parent: ID93c9cb88_ffbc_42fb_4569_7e76b8105152
    });
    core.setAttribute(IDdc1684a5_42e2_2a9e_0a84_a3e6e7144846, 'name', 'm');

    var ID37a0b0e0_3462_3873_572e_da2baf9934cd = core.createNode({
        base: META.ModelRef,
        parent: ID93c9cb88_ffbc_42fb_4569_7e76b8105152
    });
    core.setAttribute(ID37a0b0e0_3462_3873_572e_da2baf9934cd, 'name', 'm-ref');

    var IDa4168876_9c76_28c2_6b22_113f1fbebdcd = core.createNode({
        base: META.ModelElement,
        parent: ID03f45eef_42a9_3b81_6577_83ae433824ef
    });
    core.setAttribute(IDa4168876_9c76_28c2_6b22_113f1fbebdcd, 'name', 'm2');

    var ID4976900a_6e45_134e_114d_ee8f12015be5 = core.createNode({
        base: META.ModelElement,
        parent: ID03f45eef_42a9_3b81_6577_83ae433824ef
    });
    core.setAttribute(ID4976900a_6e45_134e_114d_ee8f12015be5, 'name', 'm1');

    var IDd1991fa3_6c34_7486_6ef1_00ce8efd5916 = core.createNode({
        base: META.ModelElement,
        parent: IDe8ed0ee5_68b7_727e_70f0_7adcb0d9537a
    });
    core.setAttribute(IDd1991fa3_6c34_7486_6ef1_00ce8efd5916, 'name', 'm_child');

    var ID739ab15e_66d9_58ad_b13a_55b34f3d0902 = core.createNode({
        base: META.PortElement,
        parent: IDeb3d1ee2_a339_b035_a497_6f58c63cdfc7
    });
    core.setAttribute(ID739ab15e_66d9_58ad_b13a_55b34f3d0902, 'name', 'Port1');

    var ID930d8f9d_1e7d_6068_67e8_d1c9592126ff = core.createNode({
        base: META.ConnectionElement,
        parent: IDeb3d1ee2_a339_b035_a497_6f58c63cdfc7
    });
    core.setAttribute(ID930d8f9d_1e7d_6068_67e8_d1c9592126ff, 'name', 'ConnectionElement');

    var IDa3e45f40_04f2_1841_3902_2e85934a6202 = core.createNode({
        base: META.ConnectionElement,
        parent: IDeb3d1ee2_a339_b035_a497_6f58c63cdfc7
    });
    core.setAttribute(IDa3e45f40_04f2_1841_3902_2e85934a6202, 'name', 'ConnectionElement');

    var IDfc7eb2df_e5e5_d0a4_ca3d_c649990c88d5 = core.createNode({
        base: META.ConnectionElement,
        parent: IDeb3d1ee2_a339_b035_a497_6f58c63cdfc7
    });
    core.setAttribute(IDfc7eb2df_e5e5_d0a4_ca3d_c649990c88d5, 'name', 'ConnectionElement');

    var ID71e07d33_b513_041b_3db8_6bdd3af291c5 = core.createNode({
        base: META.ModelElement,
        parent: IDeb3d1ee2_a339_b035_a497_6f58c63cdfc7
    });
    core.setAttribute(ID71e07d33_b513_041b_3db8_6bdd3af291c5, 'name', 'm1');

    var ID3bcf35ad_623a_5cf1_29b4_d31e5bfe881b = core.createNode({
        base: META.PortElement,
        parent: IDeb3d1ee2_a339_b035_a497_6f58c63cdfc7
    });
    core.setAttribute(ID3bcf35ad_623a_5cf1_29b4_d31e5bfe881b, 'name', 'Port2');

    var ID4a442956_984b_8cf1_68c7_0bb3310a5e0d = core.createNode({
        base: META.PortElement,
        parent: IDeb3d1ee2_a339_b035_a497_6f58c63cdfc7
    });
    core.setAttribute(ID4a442956_984b_8cf1_68c7_0bb3310a5e0d, 'name', 'Port3');

    var ID593c9f6b_2d6c_565f_1fa9_f61e9c310a30 = core.createNode({
        base: META.ConnectionElement,
        parent: IDeb3d1ee2_a339_b035_a497_6f58c63cdfc7
    });
    core.setAttribute(ID593c9f6b_2d6c_565f_1fa9_f61e9c310a30, 'name', 'ConnectionElement');

    var IDf4022fa5_148e_3917_0872_e11d595739bb = core.createNode({
        base: META.PortElement,
        parent: IDdc1684a5_42e2_2a9e_0a84_a3e6e7144846
    });
    core.setAttribute(IDf4022fa5_148e_3917_0872_e11d595739bb, 'name', 'p');

    var ID7dcad426_0f78_5f9f_588f_51d803896cbb = core.createNode({
        base: META.ModelElement,
        parent: IDa4168876_9c76_28c2_6b22_113f1fbebdcd
    });
    core.setAttribute(ID7dcad426_0f78_5f9f_588f_51d803896cbb, 'name', 'm21');

    var IDe00588b0_d926_f782_12cd_3fb0f6eea3ef = core.createNode({
        base: META.ModelElement,
        parent: ID4976900a_6e45_134e_114d_ee8f12015be5
    });
    core.setAttribute(IDe00588b0_d926_f782_12cd_3fb0f6eea3ef, 'name', 'm11');

    var ID3f0eef4f_a783_105c_e591_3780c782b5bb = core.createNode({
        base: META.PortElement,
        parent: ID4976900a_6e45_134e_114d_ee8f12015be5
    });
    core.setAttribute(ID3f0eef4f_a783_105c_e591_3780c782b5bb, 'name', 'p12');

    var IDb7d9e39f_8b81_e258_523d_53396e87695b = core.createNode({
        base: META.PortElement,
        parent: ID4976900a_6e45_134e_114d_ee8f12015be5
    });
    core.setAttribute(IDb7d9e39f_8b81_e258_523d_53396e87695b, 'name', 'p11');

    var ID7866081a_696c_e82e_d8d2_a64ee2025f20 = core.createNode({
        base: META.PortElement,
        parent: ID71e07d33_b513_041b_3db8_6bdd3af291c5
    });
    core.setAttribute(ID7866081a_696c_e82e_d8d2_a64ee2025f20, 'name', 'p1');

    var IDdd0c24c2_f924_6ce3_7c7a_1e96538b3d32 = core.createNode({
        base: META.PortElement,
        parent: ID7dcad426_0f78_5f9f_588f_51d803896cbb
    });
    core.setAttribute(IDdd0c24c2_f924_6ce3_7c7a_1e96538b3d32, 'name', 'p212');

    var ID92579513_ea00_d390_5ace_c50bcf7c38ec = core.createNode({
        base: META.PortElement,
        parent: IDe00588b0_d926_f782_12cd_3fb0f6eea3ef
    });
    core.setAttribute(ID92579513_ea00_d390_5ace_c50bcf7c38ec, 'name', 'p111');

    var ID34c7391c_7653_ea5f_47fc_6bd502c75c78 = core.createNode({
        base: META.ModelElement,
        parent: IDe00588b0_d926_f782_12cd_3fb0f6eea3ef
    });
    core.setAttribute(ID34c7391c_7653_ea5f_47fc_6bd502c75c78, 'name', 'm111');

    var IDcb868977_4fd6_c06a_646c_36924752d349 = core.createNode({
        base: META.ModelElement,
        parent: IDe00588b0_d926_f782_12cd_3fb0f6eea3ef
    });
    core.setAttribute(IDcb868977_4fd6_c06a_646c_36924752d349, 'name', 'm112');

    var ID97aed669_8713_aefb_0fc4_860eb1b31f33 = core.createNode({
        base: META.PortElement,
        parent: ID34c7391c_7653_ea5f_47fc_6bd502c75c78
    });
    core.setAttribute(ID97aed669_8713_aefb_0fc4_860eb1b31f33, 'name', 'p1111');


    function createMETATypesTests (core) {
        var meta = {},
            node;

        node = core.createNode({});
        core.setAttribute(node, 'name', 'FCO');
        meta.FCO = node;

        node = core.createNode({base: meta.FCO});
        core.setAttribute(node, 'name', 'ConnectionElement');
        meta.ConnectionElement = node;

        node = core.createNode({base: meta.FCO});
        core.setAttribute(node, 'name', 'Language');
        meta.Language = node;

        node = core.createNode({base: meta.FCO});
        core.setAttribute(node, 'name', 'ModelElement');
        meta.ModelElement = node;

        node = core.createNode({base: meta.FCO});
        core.setAttribute(node, 'name', 'ModelRef');
        meta.ModelRef = node;

        node = core.createNode({base: meta.FCO});
        core.setAttribute(node, 'name', 'PortElement');
        meta.PortElement = node;

        return meta;
    }

    return {
        core: core,
        META: META
    };
});