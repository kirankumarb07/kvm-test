import api from '@/store/api';

const KvmStore = {
  namespaced: true,
  state: {
    activeStatus: 0,
  },
  getters: {
    getKvmActiveStatus: (state) => state.activeStatus,
  },
  mutations: {
    setKvmActiveStatusData: (state, statusData) =>
      (state.activeStatus = statusData.kvmActiveStatus),
  },
  actions: {
    async getData({ commit }) {
      return await api
        .get('/kvm/kvmActiveStatus')
        .then((response) => {
          console.log('kvm active status', response);
          commit('setKvmActiveStatusData', response.data);
        })
        .catch((error) => {
          console.log('Error in getting KVM active status', error);
        });
    },
  },
};

export default KvmStore;
