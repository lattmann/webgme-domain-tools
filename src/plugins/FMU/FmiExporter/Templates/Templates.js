/* Generated file based on ejs templates */
define([], function() {
    return {
    "fmi_wrapper.py.ejs": "#\r\n# AUTO-GENERATED by FmiExporterPlugin (WebGME)\r\n#\r\n\r\n__author__ = 'James Klingler, ISIS Vanderbilt'\r\n\r\n\r\nfrom pymodelica import compile_fmu   # JModelica.org's 'pymodelica'\r\nfrom pyfmi import load_fmu\r\n\r\nimport logging\r\n\r\nlog = logging.getLogger()\r\n\r\nclass FMI_ME(object):\r\n\r\n    def __init__(self, model_exchange_config):\r\n    \r\n        fmu_info_map = model_exchange_config['FMUs']\r\n        sim_info = model_exchange_config['SimulationInfo']\r\n\r\n        self.conn_map = model_exchange_config['Connections']        \r\n        self.fmu_map = dict()\r\n        self.priority_map = model_exchange_config['PriorityMap']\r\n        self.sim_start_time = float(sim_info['StartTime'])\r\n        self.sim_stop_time = float(sim_info['StopTime'])\r\n        self.step_size = float(sim_info['StepSize'])\r\n        \r\n        self.load_fmus(fmu_info_map)\r\n\r\n    def load_fmus(self, fmu_info_map):\r\n\r\n        # Load and initialize the FMUs (parameters and simulation info)\r\n        for fmu_path, fmu_instance_info in fmu_info_map.iteritems():\r\n            fmu = FMU(fmu_instance_info, self.sim_start_time)\r\n            self.fmu_map[fmu_path] = fmu\r\n\r\n            \r\nclass FMU(object):\r\n\r\n    def __init__(self, fmu_info, sim_start_time):\r\n\r\n        self.name = fmu_info['InstanceName']\r\n        fmu_file_path = fmu_info['File']\r\n        self.pyfmi_fmu = load_fmu(fmu_file_path)\r\n        self.set_instance_parameters(fmu_info['Parameters'])\r\n        self.pyfmi_fmu.time = sim_start_time\r\n        self.pyfmi_fmu.initialize()\r\n        self.state_value_refs = self.pyfmi_fmu.get_state_value_references()\r\n        self.time_varying_refs = self.pyfmi_fmu.get_model_time_varying_value_references()[0]\r\n        \r\n        self.input_map = self.make_inputs(fmu_info['Inputs'])\r\n        self.output_map = self.make_outputs(fmu_info['Outputs'])\r\n\r\n\r\n    def make_inputs(self, path_name_map):\r\n\r\n        input_map = dict()\r\n    \r\n        for path, name in path_name_map.iteritems():\r\n            v_ref = self.pyfmi_fmu.get_variable_valueref(name)\r\n            input = INPUT(name, v_ref, self.name)\r\n            input_map[path] = input\r\n\r\n        return input_map\r\n\r\n    def make_outputs(self, path_name_map):\r\n\r\n        output_map = dict()\r\n    \r\n        for path, name in path_name_map.iteritems():\r\n            v_ref = self.pyfmi_fmu.get_variable_valueref(name)\r\n            output = OUTPUT(name, v_ref, self.name)\r\n            output_map[path] = output\r\n\r\n        return output_map\r\n        \r\n    def set_instance_parameters(self, parameter_map):\r\n\r\n        names = list()\r\n        values = list()\r\n\r\n        for p_name, p_value in parameter_map.iteritems():\r\n\r\n            # if '*' in p_value:\r\n            #     continue\r\n            #     multiply = p_value.split('*')\r\n\r\n            names.append(p_name)\r\n            values.append(p_value)\r\n\r\n        self.pyfmi_fmu.set(names, values)\r\n\r\nclass INPUT(object):\r\n\r\n    def __init__(self, input_name, value_ref, fmu_name):\r\n    \r\n        self.name = input_name\r\n        self.value_ref = value_ref\r\n        self.csv_row_header = fmu_name + '.' + input_name\r\n        \r\nclass OUTPUT(object):\r\n\r\n    def __init__(self, output_name, value_ref, fmu_name):\r\n    \r\n        self.name = output_name\r\n        self.value_ref = value_ref\r\n        self.csv_row_header = fmu_name + '.' + output_name",
    "jmodelica_model_exchange.py.ejs": "#\n# GENERATED by FmiExporterPlugin (WebGME)\n#\n\n__author__ = 'James Klingler - ISIS Vanderbilt'\n\nimport os\nimport sys\nimport json\nimport csv\nimport logging\nimport zipfile\ntry:\n    import zlib\n    zip_compression = zipfile.ZIP_DEFLATED\nexcept:\n    zip_compression = zipfile.ZIP_STORED\n\nimport matplotlib.pyplot as plt\nimport numpy as N\n\nfrom fmi_wrapper import FMI_ME, FMU\n\ntry:\n    from pymodelica import compile_fmu   # JModelica.org's 'pymodelica'\n    from pyfmi import load_fmu\nexcept:\n    import_error_msg = \"JModelica 'pymodelica' or 'pyfmi' module was not \" \\\n                       \"found. Make sure you have set all the environment \" \\\n                       \"variables from C:\\JModelica.org-1.12\\setenv.bat\"\n    print import_error_msg\n\n# Set up the Option parser\nfrom optparse import OptionParser\n\nparser = OptionParser()\nparser.add_option(\"-c\",\n                  \"--config\",\n                  dest=\"model_exchange_config_file\",\n                  help=\"Path to the model exchange configuration file.\")\n\n                  \nlogger = logging.getLogger()\nlogger.setLevel(logging.DEBUG)\n\n# Create a file handler with a debug log level\nfh = logging.FileHandler(\"jmodelica_model_exchange_py.log\")\nfh.setLevel(logging.DEBUG)\n\n# create console handler with a higher log level\nch = logging.StreamHandler()\nch.setLevel(logging.WARNING)\n\n# create formatter and add it to the handlers\nformatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')\nfh.setFormatter(formatter)\nch.setFormatter(formatter)\n\n# add the handlers to the logger\nlogger.addHandler(fh)\nlogger.addHandler(ch)\n\ndef read_model_exchange_config(model_exchange_config_file):\n\n    logger.debug(\"Enter 'read_model_exchange_config({0})'\".format(model_exchange_config_file))\n\n    with open(model_exchange_config_file, 'r') as f_in:\n        config_dict = json.load(f_in)\n\n    return config_dict\n    \n\ndef run_explicit_euler(fmi_me_object):\n\n    logger.debug(\"Enter 'run_explicit_euler'\")\n\n    # All FMUs have been loaded and initialized\n\n    sim_start_time = fmi_me_object.sim_start_time\n    sim_end_time = fmi_me_object.sim_stop_time\n    integration_step_size = fmi_me_object.step_size\n\n    # Create the time-series & results variables and set the initial values\n    # Also, initialize the terminate simulation var\n    #time_for_result = np.array([sim_start_time])\n    time_for_result = [sim_start_time]\n\n    results_data = dict()\n    terminate_simulation = list()\n\n    # initialize result arrays for all state variables\n    for fmu_path, fmu in fmi_me_object.fmu_map.iteritems():\n    \n        fmu_result = fmu.pyfmi_fmu.get_real(fmu.time_varying_refs)\n        results_data.update({fmu.name: [fmu_result]})\n        terminate_simulation.append(fmu.pyfmi_fmu.get_event_info().terminateSimulation)\n\n    i = 0\n    #index_for_result = np.array([i])\n    index_for_result = [i]\n    time_at_step_i = sim_start_time  # initialize the 'time' variable\n    t_next = sim_end_time\n\n    while time_at_step_i < sim_end_time and not True in terminate_simulation:\n\n        # Get the time_increment size\n        t_increment = min(integration_step_size, t_next-time_at_step_i)\n\n        # Increment the index and the time\n        i += 1\n        time_at_step_i = time_at_step_i + t_increment\n        \n        logger.debug(\"Solving system for t={0}\".format(time_at_step_i))\n        \n        for i in range(len(fmi_me_object.priority_map)):\n\n            priority_level = str(i + 1)\n            priority_level_list = fmi_me_object.priority_map[priority_level]\n        \n            for fmu_path in priority_level_list:\n           \n                fmu = fmi_me_object.fmu_map[fmu_path]\n                \n                logger.debug(\"Solving {0}\".format(fmu.name))\n\n                # Get existing event indicators\n                event_indicators = fmu.pyfmi_fmu.get_event_indicators()\n\n                # Get existing states and compute derivatives of the FMU\n                x_bar = fmu.pyfmi_fmu.continuous_states\n                x_dot = fmu.pyfmi_fmu.get_derivatives()\n\n                # Set time of the FMU\n                fmu.pyfmi_fmu.time = time_at_step_i\n\n                # Compute new states and set them\n                x_bar = x_bar + t_increment*x_dot\n                fmu.pyfmi_fmu.continuous_states = x_bar\n\n\n                ########### Check for Events ###############\n                \n                # Get new event indicators\n                event_indicators_new = fmu.pyfmi_fmu.get_event_indicators()\n\n                # Inform FMUs of the step and check for a step event (returns True/False)\n                step_event = fmu.pyfmi_fmu.completed_integrator_step()\n\n                # Check for time and state events (time events are 'predictable', state events are not necessarily so)\n                time_event  = abs(time_at_step_i-t_next) <= 1.e-10  # this one checks for the end (?)\n                state_event = True if True in ((event_indicators_new>0.0) != (event_indicators>0.0)) else False\n\n                # Handle any events\n                if step_event or time_event or state_event:\n\n                    event_info = fmu.pyfmi_fmu.get_event_info()\n                    event_info.iterationConverged = False\n\n                    # Event iteration\n                    while event_info.iterationConverged == False:\n\n                        fmu.pyfmi_fmu.event_update(intermediateResult=True) #Stops after each event iteration\n                        event_info = fmu.pyfmi_fmu.get_event_info()\n\n                        #Retrieve solutions (if needed)\n                        if event_info.iterationConverged == False:\n                            # fmu.get_real, get_integer, get_boolean,\n                            # get_string(valueref)\n                            pass\n\n                    # Check if the event affected the state values and if so sets them\n                    if event_info.stateValuesChanged:\n                        x_bar = fmu.pyfmi_fmu.continuous_states\n\n                    # Get new nominal values.\n                    if event_info.stateValueReferencesChanged:\n                        atol = 0.01*rtol*fmu.pyfmi_fmu.nominal_continuous_states\n\n\n                    # Check for new time event\n                    if event_info.upcomingTimeEvent:\n                        t_next = min(event_info.nextEventTime, sim_end_time)\n                    else:\n                        t_next = sim_end_time\n\n                ##########################\n\n                fmu_result = fmu.pyfmi_fmu.get_real(fmu.time_varying_refs)\n                result_array = results_data[fmu.name]\n                result_array.append(fmu_result)\n\n                # Propagate output values\n                for output_path, output_object in fmu.output_map.iteritems():\n                    output_value = fmu.pyfmi_fmu.get_real(output_object.value_ref)\n                \n                    if output_path in fmi_me_object.conn_map:\n                        for target_input_path in fmi_me_object.conn_map[output_path]:\n                            target_fmu_path = get_parent_fmu_path(target_input_path)\n                            target_fmu = fmi_me_object.fmu_map[target_fmu_path]\n                            input_value_ref = target_fmu.input_map[target_input_path].value_ref\n                            target_fmu.pyfmi_fmu.set_real(input_value_ref, output_value)\n\n        time_for_result.append(time_at_step_i)\n    \n    #  Save results\n    logger.debug(\"Saving .csv and.svg files\")   \n\n    save_results(fmi_me_object.fmu_map, time_for_result, results_data)\n    \n    \ndef save_results(fmu_map, time_for_result, results_data):\n\n    if not os.path.isdir('Results'):\n        os.mkdir('Results')\n        \n    os.chdir('Results')\n    \n    name_plus_data = ['time'] + time_for_result\n    \n    with open('results.csv', 'ab') as result_file:\n        csv_writer = csv.writer(result_file)\n        csv_writer.writerow(name_plus_data)\n\n    plot_index = 1\n\n    webgme_path_2_plot_path = dict()\n\n    for fmu_path, fmu in fmu_map.iteritems():\n    \n        plt.figure(plot_index)\n        plt.title(fmu.name + ' - Time-changing Variables')\n        plt.xlabel('Time (s)')\n        plot_index += 1\n    \n        # Save all time-varying results to csv\n        for value_ref in fmu.time_varying_refs:\n        \n            value_ref_index = fmu.time_varying_refs.index(value_ref)\n            variable_name = fmu.pyfmi_fmu.get_variable_by_valueref(value_ref)\n            full_name = fmu.name + '.' + variable_name\n            data_series = N.array(results_data[fmu.name])[:,value_ref_index]\n            data_series_list = data_series.tolist()\n            plt.plot(time_for_result, data_series, label=variable_name)\n            name_plus_data_series = [full_name] + data_series_list\n            with open('results.csv', 'ab') as result_file:\n                csv_writer = csv.writer(result_file)\n                csv_writer.writerow(name_plus_data_series)\n\n        plt.legend(loc=0)\n        plot_name = fmu.name + '_All.svg'\n        plt.savefig(plot_name)\n        plt.close()\n        \n        webgme_path_2_plot_path[fmu_path] = plot_name\n                \n        for webgme_path, input_object in fmu.input_map.iteritems():\n        \n            plt.figure(plot_index)\n            plt.title(input_object.csv_row_header)\n            plt.xlabel('Time (s)')\n            plot_index += 1\n        \n            input_valueref = input_object.value_ref\n            var_to_plot_index = fmu.time_varying_refs.index(input_valueref)\n            data_series = N.array(results_data[fmu.name])[:,var_to_plot_index]\n            plt.plot(time_for_result, data_series, label=input_object.name)\n            \n            plot_name = fmu.name + '_' + input_object.name + '.svg'\n            plt.savefig(plot_name)\n            plt.close()\n            \n            webgme_path_2_plot_path[webgme_path] = plot_name\n            \n        for webgme_path, output_object in fmu.output_map.iteritems():\n        \n            plt.figure(plot_index)\n            plt.title(output_object.csv_row_header)\n            plt.xlabel('Time (s)')\n            plot_index += 1\n        \n            output_valueref = output_object.value_ref\n            var_to_plot_index = fmu.time_varying_refs.index(output_valueref)\n            data_series = N.array(results_data[fmu.name])[:,var_to_plot_index]\n            plt.plot(time_for_result, data_series, label=output_object.name)\n\n            plot_name = fmu.name + '_' + output_object.name + '.svg'\n            plt.savefig(plot_name)\n            plt.close()\n            \n            webgme_path_2_plot_path[webgme_path] = plot_name\n        \n    with open('plot_map.json', 'wb') as plot_map_file:\n        json.dump(webgme_path_2_plot_path, plot_map_file)\n        \n    os.chdir('..')\n    \n\ndef get_parent_fmu_path(fmu_input_path):\n\n    input_split_path = fmu_input_path.split('/')\n    parent_split_path = input_split_path[:-1]\n    parent_fmu_path = '/'.join(parent_split_path)\n    \n    return parent_fmu_path\n    \n            \ndef main():\n\n    logger.debug(\"===================================\")\n    logger.debug(\"RUNNING jmodelica_model_exchange.py\")\n    logger.debug(\"===================================\")\n\n    (options, args) = parser.parse_args()\n\n    config_file = r'.\\\\model_exchange_config.json'\n\n    if options.model_exchange_config_file:\n        config_file = options.model_exchange_config_file\n\n    me_config = read_model_exchange_config(config_file)\n\n    fmi_object = FMI_ME(me_config)\n\n    run_explicit_euler(fmi_object)\n\n\nif __name__ == '__main__':\n\n    root_dir = os.getcwd()\n\n    try:\n        main()\n    except:\n        import traceback\n        trace = traceback.format_exc()\n\n        logger.error(trace)\n        logger.info('See jmodelica_model_exchange_py.log for details.')\n        \n        sys.exit(2)\n",
    "ReadMe.txt.ejs": "NOTE: This requires JModelica v1.12 to be installed at \"C:\\JModelica.org-1.12\", and 'system' Python at \"C:\\Python27\\python.exe\"\r\n\r\n1) Open a command window\r\n2) run 'run_jmodelica_model_exchange.cmd' \r\n    - input/output plots should be generated for all FMUs\r\n\r\n- All the necessary FMUs are here in the directory\r\n- The model_exchange_config.json explains how they should be connected\r\n- jmodelica_model_exchange.py reads the config file and runs 'explicit euler' model exchange simulation using JModelica\r\n",
    "run_jmodelica_model_exchange.cmd.ejs": ":: Use System Python (which should have access to JModelica) to run the FMI_ME example\r\necho off\r\npushd %~dp0\r\ncall C:\\JModelica.org-1.12\\setenv.bat\r\n\"C:\\Python27\\python.exe\" .\\\\jmodelica_model_exchange.py .\\\\model_exchange_config.json\r\npopd"
}});