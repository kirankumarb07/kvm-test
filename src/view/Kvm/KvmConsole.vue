<template>
  <div :class="marginClass">
    <div ref="toolbar" class="kvm-toolbar">
      <b-row class="d-flex">
        <b-col class="d-flex flex-column justify-content-end" cols="4">
          <dl class="mb-2" sm="2" md="2">
            <dt class="d-inline font-weight-bold mr-1">
              {{ $t('pageKvm.status') }}:
            </dt>
            <dd class="d-inline">
              <status-icon :status="serverStatusIcon" />
              <span class="d-none d-md-inline"> {{ serverStatus }}</span>
            </dd>
          </dl>
        </b-col>

        <b-col class="d-flex justify-content-end pr-1">
          <b-button
            v-if="isConnected"
            variant="link"
            type="button"
            @click="sendCtrlAltDel"
          >
            <icon-arrow-down />
            {{ $t('pageKvm.buttonCtrlAltDelete') }}
          </b-button>
          <b-button
            v-if="!isFullWindow"
            variant="link"
            type="button"
            @click="openConsoleWindow()"
          >
            <icon-launch />
            {{ $t('pageKvm.openNewTab') }}
          </b-button>
        </b-col>
      </b-row>
    </div>
    <div id="terminal-kvm" ref="panel" :class="terminalClass"></div>
  </div>
</template>

<script>
import RFB from '@novnc/novnc/core/rfb';
import StatusIcon from '@/components/Global/StatusIcon';
import IconLaunch from '@carbon/icons-vue/es/launch/20';
import IconArrowDown from '@carbon/icons-vue/es/arrow--down/16';
import BVToastMixin from '@/components/Mixins/BVToastMixin';
import LoadingBarMixin from '@/components/Mixins/LoadingBarMixin';
import { throttle } from 'lodash';
import { mapState } from 'vuex';

const Connecting = 0;
const Connected = 1;
const Disconnected = 2;

export default {
  name: 'KvmConsole',
  components: { StatusIcon, IconLaunch, IconArrowDown },
  mixins: [BVToastMixin, LoadingBarMixin],
  props: {
    isFullWindow: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      isconsoleWindow: null,
      rfb: null,
      isConnected: false,
      terminalClass: this.isFullWindow ? 'full-window' : '',
      marginClass: this.isFullWindow ? 'margin-left-full-window' : '',
      status: Connecting,
      convasRef: null,
      resizeKvmWindow: null,
    };
  },
  computed: {
    ...mapState('authentication', ['consoleWindow']),
    serverStatusIcon() {
      if (this.status === Connected) {
        return 'success';
      } else if (this.status === Disconnected) {
        return 'danger';
      }
      return 'secondary';
    },
    serverStatus() {
      if (this.status === Connected) {
        return this.$t('pageKvm.connected');
      } else if (this.status === Disconnected) {
        return this.$t('pageKvm.disconnected');
      } else if (this.getKvmActiveData()) {
        return this.$t('pageKvm.alreadyInMasterSession');
      }
      return this.$t('pageKvm.connecting');
    },
  },
  watch: {
    consoleWindow() {
      if (this.consoleWindow == false) {
        this.isconsoleWindow.close();
        this.$root.$emit('refresh-application');
      }
    },
  },
  mounted() {
    setTimeout(() => {
      this.$store
        .dispatch('kvm/getData')
        .then(() => {
          if (this.getKvmActiveData()) {
            this.errorToast(this.$t('pageKvm.alreadyActiveSession'));
          } else {
            this.openTerminal();
          }
        })
        .catch((error) => {
          console.log(error);
          this.errorToast(this.$t('pageKvm.errorInGettingActiveStatus'));
        })
        .finally(() => {
          this.endLoader();
        });
    }, 500);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.resizeKvmWindow);
    this.closeTerminal();
  },
  methods: {
    sendCtrlAltDel() {
      this.rfb.sendCtrlAltDel();
    },
    closeTerminal() {
      this.rfb.disconnect();
      this.rfb = null;
    },
    getKvmActiveData() {
      let kvmData = this.$store.getters['kvm/getKvmActiveStatus'];
      return kvmData;
    },
    openTerminal() {
      const token = this.$store.getters['authentication/token'];
      this.rfb = new RFB(
        this.$refs.panel,
        `wss://${window.location.host}/kvm/0`,
        { wsProtocols: [token] }
      );

      this.rfb.scaleViewport = true;
      this.rfb.clipViewport = true;
      const that = this;

      this.resizeKvmWindow = throttle(() => {
        setTimeout(that.setWidthToolbar, 0);
      }, 1000);
      window.addEventListener('resize', this.resizeKvmWindow);

      this.rfb.addEventListener('connect', () => {
        that.isConnected = true;
        that.status = Connected;
        that.setWidthToolbar();
      });

      this.rfb.addEventListener('disconnect', () => {
        this.isConnected = false;
        that.status = Disconnected;
      });
    },
    setWidthToolbar() {
      if (
        this.$refs.panel.children &&
        this.$refs.panel.children.length > 0 &&
        this.$refs.panel.children[0].children.length > 0
      ) {
        this.$refs.toolbar.style.width =
          this.$refs.panel.children[0].children[0].clientWidth - 10 + 'px';
      }
    },
    openConsoleWindow() {
      if (this.rfb != null && this.isconsoleWindow == null) {
        this.rfb.disconnect();
        this.rfb = null;
        this.isconsoleWindow = window.open(
          '#/console/kvm',
          '_blank',
          'directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=yes,width=700,height=550'
        );
      }
    },
  },
};
</script>

<style scoped lang="scss">
.button-ctrl-alt-delete {
  float: right;
}

.kvm-status {
  padding-top: $spacer / 2;
  padding-left: $spacer / 4;
  display: inline-block;
}

.margin-left-full-window {
  margin-left: 5px;
}
</style>
